"use client"

import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react"
import { Icon } from "@lib/icons"
import { decryptName } from "@lib/e2e"
import { type GridAsset, assetOriginalUrl, favoriteAssets, trashAssets } from "@lib/photos"
import { fetchDecryptedPhotoOriginal } from "@lib/photosE2e"
import { useUploadManager } from "@lib/uploadManager"
import InfoPanel from "@pages/Photos/components/InfoPanel/InfoPanel"
import MediaPlayer from "@pages/Photos/components/MediaPlayer/MediaPlayer"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"

interface LightboxProps {
  assets: GridAsset[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}

const Lightbox = ({ assets, index, onIndexChange, onClose }: LightboxProps) => {
  const queryClient = useQueryClient()
  const upload = useUploadManager()
  const [info, setInfo] = useState(false)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement>(null)
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinch = useRef<{ dist: number; scale: number } | null>(null)
  const pan = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null)
  const deleteArmed = useRef(false)
  const asset = assets[index]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!asset || !event.shiftKey || event.key.toLowerCase() !== "d") return
      event.preventDefault()
      if (deleteArmed.current) {
        deleteArmed.current = false
        void trashAssets([asset.id]).then(() => {
          void queryClient.invalidateQueries({ queryKey: ["photos"] })
          if (assets.length <= 1) onClose()
          else onIndexChange(index > 0 ? index - 1 : index + 1)
        })
      } else {
        deleteArmed.current = true
        toast("Press Shift+D again to move to trash")
        window.setTimeout(() => {
          deleteArmed.current = false
        }, 3000)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [asset, assets.length, index, onClose, onIndexChange, queryClient])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "i") setInfo((value) => !value)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [index])

  useEffect(() => {
    if (scale === 1) setOffset({ x: 0, y: 0 })
  }, [scale])

  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      setScale((value) => Math.max(0.25, Math.min(3, value - event.deltaY * 0.01)))
    }
    element.addEventListener("wheel", onWheel, { passive: false })
    return () => element.removeEventListener("wheel", onWheel)
  }, [])

  if (!asset) return null

  const pinchDistance = (): number => {
    const points = [...pointers.current.values()]
    return points.length < 2 ? 0 : Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y)
  }
  const clampOffset = (next: { x: number; y: number }, atScale: number) => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return next
    const maxX = (rect.width * (atScale - 1)) / 2
    const maxY = (rect.height * (atScale - 1)) / 2
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    }
  }
  const onStagePointerDown = (event: ReactPointerEvent) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      pinch.current = { dist: pinchDistance(), scale }
      pan.current = null
    } else if (scale > 1) {
      pan.current = { id: event.pointerId, x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
      stageRef.current?.setPointerCapture(event.pointerId)
    }
  }
  const onStagePointerMove = (event: ReactPointerEvent) => {
    if (pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    const startPinch = pinch.current
    if (pointers.current.size === 2 && startPinch && startPinch.dist > 0) {
      setScale(Math.max(0.25, Math.min(3, startPinch.scale * (pinchDistance() / startPinch.dist))))
      return
    }
    const startPan = pan.current
    if (startPan && startPan.id === event.pointerId) {
      setOffset(
        clampOffset(
          { x: startPan.ox + (event.clientX - startPan.x), y: startPan.oy + (event.clientY - startPan.y) },
          scale,
        ),
      )
    }
  }
  const onStagePointerUp = (event: ReactPointerEvent) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pan.current?.id === event.pointerId) pan.current = null
  }

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["photos"] })

  const toggleFavourite = async () => {
    await favoriteAssets([asset.id], !asset.isFavorite).catch(() => undefined)
    refresh()
  }

  const moveToTrash = async () => {
    await trashAssets([asset.id]).catch(() => undefined)
    refresh()
    if (assets.length <= 1) onClose()
    else onIndexChange(index > 0 ? index - 1 : index + 1)
  }

  const displayName =
    (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename
  const download = () =>
    upload.download(displayName, [{ id: asset.id, name: displayName, encrypted: asset.encrypted }])

  const [decryptedSrc, setDecryptedSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!asset.encrypted) {
      setDecryptedSrc(null)
      return
    }
    let active = true
    let url: string | null = null
    void fetchDecryptedPhotoOriginal(asset.id, asset.mimeType).then((result) => {
      if (!active) {
        if (result) URL.revokeObjectURL(result)
        return
      }
      url = result
      setDecryptedSrc(result)
    })
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [asset.id, asset.encrypted, asset.mimeType])

  const source = asset.encrypted
    ? (decryptedSrc ?? undefined)
    : (asset.previewUrl ?? asset.thumbnailUrl ?? undefined)
  const taken = asset.takenAt ? new Date(asset.takenAt).toLocaleDateString() : undefined

  return (
    <motion.div
      className="bg-background/80 fixed inset-0 z-50 flex backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 p-3">
        <div className="panel flex min-w-0 items-center gap-1.5 rounded-full p-1 pr-3 shadow-lg">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full"
          >
            <Icon name="xmark" className="size-5" />
          </Button>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="max-w-[40vw] truncate text-xs font-medium">{displayName}</span>
            {taken ? <span className="text-muted-foreground text-[11px]">{taken}</span> : null}
          </div>
        </div>

        <div className="panel flex items-center gap-0.5 rounded-full p-1 shadow-lg">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Favourite"
            onClick={toggleFavourite}
            className="rounded-full"
          >
            <Icon name="favourites" className={cn("size-5", asset.isFavorite && "text-primary")} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Download"
            onClick={download}
            className="rounded-full"
          >
            <Icon name="download" className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Move to trash"
            onClick={moveToTrash}
            className="rounded-full"
          >
            <Icon name="trash" className="size-5" />
          </Button>
          <span className="bg-border mx-0.5 h-5 w-px" />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Info"
            onClick={() => setInfo((value) => !value)}
            className={cn("rounded-full", info && "bg-muted")}
          >
            <Icon name="info" className="size-5" />
          </Button>
        </div>
      </div>

        <div
          ref={stageRef}
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-6 sm:p-10",
            asset.type === "image" && "touch-none",
            asset.type === "image" && scale > 1 && "cursor-grab active:cursor-grabbing",
          )}
          onPointerDown={asset.type === "image" ? onStagePointerDown : undefined}
          onPointerMove={asset.type === "image" ? onStagePointerMove : undefined}
          onPointerUp={asset.type === "image" ? onStagePointerUp : undefined}
          onPointerCancel={asset.type === "image" ? onStagePointerUp : undefined}
        >
          {index > 0 ? (
            <button
              type="button"
              aria-label="Previous"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onIndexChange(index - 1)}
              className="panel hover:bg-muted absolute left-4 z-10 flex size-10 items-center justify-center rounded-full shadow-lg transition"
            >
              <Icon name="nav-back" className="size-5" />
            </button>
          ) : null}

          {asset.type === "video" ? (
            <MediaPlayer
              key={asset.id}
              kind="video"
              src={asset.encrypted ? (decryptedSrc ?? "") : (asset.videoUrl ?? "")}
              poster={asset.encrypted ? undefined : (asset.previewUrl ?? undefined)}
            />
          ) : asset.type === "audio" ? (
            <MediaPlayer
              key={asset.id}
              kind="audio"
              src={asset.encrypted ? (decryptedSrc ?? "") : assetOriginalUrl(asset.id)}
              name={displayName}
            />
          ) : source ? (
            <motion.div
              className="flex h-full w-full items-center justify-center"
              animate={{ scale, x: offset.x, y: offset.y }}
              transition={{ duration: 0.1, ease: "easeOut" }}
            >
              <motion.img
                layoutId={`photo-${asset.id}`}
                src={source}
                alt={displayName}
                draggable={false}
                className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
                style={{
                  backgroundImage:
                    !asset.encrypted && asset.thumbnailUrl
                      ? `url(${asset.thumbnailUrl})`
                      : undefined,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
                transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              />
            </motion.div>
          ) : (
            <p className="text-muted-foreground text-sm">Still processing…</p>
          )}

          {asset.type === "image" && source ? (
            <div
              className="panel absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-full p-1 shadow-lg"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Zoom out"
                onClick={() => setScale((value) => Math.max(0.25, Number((value - 0.25).toFixed(2))))}
                className="rounded-full"
              >
                <Icon name="minus" className="size-4" />
              </Button>
              <span className="w-11 text-center text-xs font-semibold tabular-nums">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Zoom in"
                onClick={() => setScale((value) => Math.min(3, Number((value + 0.25).toFixed(2))))}
                className="rounded-full"
              >
                <Icon name="plus" className="size-4" />
              </Button>
              <span className="bg-border mx-0.5 h-5 w-px" />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Reset zoom"
                onClick={() => {
                  setScale(1)
                  setOffset({ x: 0, y: 0 })
                }}
                className="rounded-full"
              >
                <Icon name="zoom-reset" className="size-4" />
              </Button>
            </div>
          ) : null}

          {index < assets.length - 1 ? (
            <button
              type="button"
              aria-label="Next"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onIndexChange(index + 1)}
              className="panel hover:bg-muted absolute right-4 z-10 flex size-10 items-center justify-center rounded-full shadow-lg transition"
            >
              <Icon name="nav-forward" className="size-5" />
            </button>
          ) : null}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {info ? (
          <motion.aside
            key="info"
            className="shrink-0 overflow-hidden py-3 pr-3"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 380, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <div className="panel scrollbar-slim h-full w-[356px] overflow-hidden rounded-2xl">
              <InfoPanel assetId={asset.id} />
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

export default Lightbox
