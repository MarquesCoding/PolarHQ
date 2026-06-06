"use client"

import { useEffect, useRef, useState } from "react"
import { Icon } from "@lib/icons"
import { decryptName } from "@lib/e2e"
import { type GridAsset, assetOriginalUrl, favoriteAssets, trashAssets } from "@lib/photos"
import { fetchDecryptedMotionVideo, fetchDecryptedPhotoOriginal } from "@lib/photosE2e"
import { useZoomPan } from "@lib/useZoomPan"
import { IconLivePhoto } from "@tabler/icons-react"
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
  const deleteArmed = useRef(false)
  const asset = assets[index]
  const zoom = useZoomPan(asset?.id)

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

  if (!asset) return null

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

  const [motionSrc, setMotionSrc] = useState<string | null>(null)
  const [playMotion, setPlayMotion] = useState(false)
  useEffect(() => {
    setPlayMotion(false)
    setMotionSrc(null)
    if (!asset.motion) return
    let active = true
    let url: string | null = null
    void fetchDecryptedMotionVideo(asset.id).then((result) => {
      if (!active) {
        if (result) URL.revokeObjectURL(result)
        return
      }
      url = result
      setMotionSrc(result)
    })
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [asset.id, asset.motion])

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

        <div className="flex items-center gap-2">
        {asset.type === "image" && source ? (
          <div className="panel flex items-center gap-0.5 rounded-full p-1 shadow-lg">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom out"
              onClick={zoom.zoomOut}
              className="rounded-full"
            >
              <Icon name="minus" className="size-4" />
            </Button>
            <span className="w-11 text-center text-xs font-semibold tabular-nums">
              {Math.round(zoom.scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Zoom in"
              onClick={zoom.zoomIn}
              className="rounded-full"
            >
              <Icon name="plus" className="size-4" />
            </Button>
            <span className="bg-border mx-0.5 h-5 w-px" />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Reset zoom"
              onClick={zoom.reset}
              className="rounded-full"
            >
              <Icon name="zoom-reset" className="size-4" />
            </Button>
          </div>
        ) : null}
        <div className="panel flex items-center gap-0.5 rounded-full p-1 shadow-lg">
          {asset.motion && asset.type === "image" && motionSrc ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Play motion"
              onClick={() => setPlayMotion((value) => !value)}
              className={cn("rounded-full", playMotion && "bg-muted")}
            >
              <IconLivePhoto className="size-5" />
            </Button>
          ) : null}
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
      </div>

        <div
          ref={zoom.stageRef}
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-6 sm:p-10",
            asset.type === "image" && "touch-none",
            asset.type === "image" && zoom.canPan && "cursor-grab active:cursor-grabbing",
          )}
          onPointerDown={asset.type === "image" ? zoom.stageHandlers.onPointerDown : undefined}
          onPointerMove={asset.type === "image" ? zoom.stageHandlers.onPointerMove : undefined}
          onPointerUp={asset.type === "image" ? zoom.stageHandlers.onPointerUp : undefined}
          onPointerCancel={asset.type === "image" ? zoom.stageHandlers.onPointerCancel : undefined}
        >
          {index > 0 ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onIndexChange(index - 1)}
              className="panel hover:bg-muted absolute left-4 z-10 size-10 rounded-full shadow-lg"
            >
              <Icon name="nav-back" className="size-5" />
            </Button>
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
              animate={{ scale: zoom.scale, x: zoom.offset.x, y: zoom.offset.y }}
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

          {asset.type === "image" && playMotion && motionSrc ? (
            <video
              key={`motion-${asset.id}`}
              src={motionSrc}
              autoPlay
              muted
              loop
              playsInline
              onEnded={() => setPlayMotion(false)}
              className="absolute inset-0 z-10 m-auto max-h-full max-w-full rounded-2xl object-contain p-6 sm:p-10"
            />
          ) : null}

          {index < assets.length - 1 ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onIndexChange(index + 1)}
              className="panel hover:bg-muted absolute right-4 z-10 size-10 rounded-full shadow-lg"
            >
              <Icon name="nav-forward" className="size-5" />
            </Button>
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
