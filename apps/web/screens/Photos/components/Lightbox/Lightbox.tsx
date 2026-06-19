"use client"

import { dateLocale } from "@lib/i18n/format"
import { type ReactElement, useEffect, useRef, useState } from "react"
import { Icon } from "@lib/icons"
import { decryptName } from "@lib/e2e"
import { type GridAsset, assetOriginalUrl, favoriteAssets, sharePhoto, trashAssets } from "@lib/photos"
import {
  fetchDecryptedMotionVideo,
  fetchDecryptedPhotoOriginal,
  fetchDecryptedPhotoThumbnail,
} from "@lib/photosE2e"
import { usePersistentNumber } from "@lib/persistentSetting"
import { useZoomPan } from "@lib/useZoomPan"
import { IconDots, IconLivePhoto } from "@tabler/icons-react"
import { useUploadManager } from "@lib/uploadManager"
import { decryptedThumbnails } from "@pages/Photos/components/PhotoTile/PhotoTile"
import InfoPanel from "@pages/Photos/components/InfoPanel/InfoPanel"
import PhotoEditor from "@pages/Photos/components/PhotoEditor/PhotoEditor"
import MediaPlayer from "@pages/Photos/components/MediaPlayer/MediaPlayer"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip"
import ShareDialog from "@components/ShareDialog/ShareDialog"
import { cn } from "@workspace/ui/lib/utils"
import NumberFlow from "@number-flow/react"
import { AnimatePresence, motion } from "motion/react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

interface LightboxProps {
  assets: GridAsset[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  /** Show a thumbnail strip of every asset along the bottom — used for stack/burst viewing. */
  filmstrip?: boolean
}

/** A toolbar button with a hover tooltip (the buttons are icon-only and otherwise ambiguous). */
const Tip = ({ label, children }: { label: string; children: ReactElement }) => (
  <Tooltip>
    <TooltipTrigger render={children} />
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
)

/** A single filmstrip thumbnail, reusing PhotoTile's session cache for decrypted thumbnails. */
const FilmstripThumb = ({ asset, active }: { asset: GridAsset; active: boolean }) => {
  const [src, setSrc] = useState<string | null>(() =>
    asset.encrypted ? (decryptedThumbnails.get(asset.id) ?? null) : (asset.thumbnailUrl ?? null),
  )
  useEffect(() => {
    if (!asset.encrypted) {
      setSrc(asset.thumbnailUrl ?? null)
      return
    }
    const cached = decryptedThumbnails.get(asset.id)
    if (cached) {
      setSrc(cached)
      return
    }
    let on = true
    void fetchDecryptedPhotoThumbnail(asset.id).then((result) => {
      if (!result) return
      decryptedThumbnails.set(asset.id, result)
      if (on) setSrc(result)
    })
    return () => {
      on = false
    }
  }, [asset.id, asset.encrypted, asset.thumbnailUrl])

  return (
    <span
      className={cn(
        "relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition",
        active
          ? "border-primary ring-primary scale-105 ring-2"
          : "border-foreground/10 opacity-60 hover:opacity-100",
      )}
    >
      {src ? (
        <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />
      ) : (
        <span className="bg-muted block h-full w-full" />
      )}
    </span>
  )
}

/** Above this, an encrypted video can't be whole-buffer decrypted for in-browser playback without
 *  OOMing the tab — we offer a streaming download instead (true streaming playback is a later phase). */
const PLAYABLE_ENCRYPTED_MAX = 1.5 * 1024 * 1024 * 1024

const Lightbox = ({ assets, index, onIndexChange, onClose, filmstrip }: LightboxProps) => {
  const { t } = useTranslation("photos")
  const queryClient = useQueryClient()
  const upload = useUploadManager()
  const [infoPref, setInfoPref] = usePersistentNumber("photos.lightboxDetails", 0)
  const info = infoPref === 1
  const toggleInfo = () => setInfoPref(info ? 0 : 1)
  const [stripPref, setStripPref] = usePersistentNumber("photos.lightboxFilmstrip", 0)
  const showStrip = (filmstrip || stripPref === 1) && assets.length > 1
  const toggleStrip = () => setStripPref(stripPref ? 0 : 1)
  const deleteArmed = useRef(false)
  const [editing, setEditing] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const asset = assets[index]
  const tooLargeToPreview =
    !!asset?.encrypted && asset.type === "video" && asset.sizeBytes > PLAYABLE_ENCRYPTED_MAX
  const zoom = useZoomPan(asset?.id)
  const activeThumbRef = useRef<HTMLButtonElement | null>(null)
  const stripRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!showStrip) return
    const thumb = activeThumbRef.current
    const container = stripRef.current
    if (!thumb || !container) return
    const tRect = thumb.getBoundingClientRect()
    const cRect = container.getBoundingClientRect()
    const target =
      container.scrollLeft + (tRect.left - cRect.left) - container.clientWidth / 2 + tRect.width / 2
    container.scrollTo({ left: target, behavior: "smooth" })
  }, [index, showStrip])

  useEffect(() => {
    if (!asset) onClose()
  }, [asset, onClose])

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
        toast(t("lightbox.confirmTrashHint"))
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
      if (event.key.toLowerCase() === "i") toggleInfo()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return
      if (event.key === "Escape") {
        onClose()
      } else if (event.key === "ArrowLeft" && index > 0) {
        onIndexChange(index - 1)
      } else if (event.key === "ArrowRight" && index < assets.length - 1) {
        onIndexChange(index + 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, assets.length, onClose, onIndexChange])

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
    upload.download(displayName, [
      { id: asset.id, name: displayName, encrypted: asset.encrypted, size: asset.sizeBytes },
    ])

  const copyImage = async () => {
    if (asset.type !== "image") return
    const toPng = async (): Promise<Blob> => {
      const url = asset.encrypted
        ? (decryptedSrc ?? (await fetchDecryptedPhotoOriginal(asset.id, asset.mimeType)))
        : assetOriginalUrl(asset.id)
      if (!url) throw new Error("no source")
      const blob = await fetch(url, { credentials: "include" }).then((response) => response.blob())
      if (blob.type === "image/png") return blob
      const bitmap = await createImageBitmap(blob)
      const canvas = document.createElement("canvas")
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const context = canvas.getContext("2d")
      if (!context) throw new Error("no canvas context")
      context.drawImage(bitmap, 0, 0)
      bitmap.close()
      return new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error("encode failed"))),
          "image/png",
        ),
      )
    }
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": toPng() })])
      toast.success(t("lightbox.imageCopied"))
    } catch {
      toast.error(t("lightbox.imageCopyFailed"))
    }
  }

  const [decryptedSrc, setDecryptedSrc] = useState<string | null>(null)
  useEffect(() => {
    if (!asset.encrypted || tooLargeToPreview) {
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
  }, [asset.id, asset.encrypted, asset.mimeType, tooLargeToPreview])

  const source = asset.encrypted
    ? (decryptedSrc ?? undefined)
    : (asset.previewUrl ?? asset.thumbnailUrl ?? undefined)
  const taken = asset.takenAt ? new Date(asset.takenAt).toLocaleDateString(dateLocale()) : undefined

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <motion.div
        className="bg-background border-border/50 relative flex h-full max-h-[88vh] w-full max-w-[1600px] overflow-hidden rounded-2xl border shadow-2xl"
        initial={{ scale: 0.97 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.97 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
      {source ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            key={asset.id}
            src={source}
            alt=""
            className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-3xl"
          />
          <div className="bg-background/50 absolute inset-0" />
        </div>
      ) : null}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative flex items-center justify-between gap-2 p-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("lightbox.close")}
            onClick={onClose}
            className="rounded-full"
          >
            <Icon name="xmark" className="size-5" />
          </Button>
          <span className="pointer-events-none absolute top-1/2 left-1/2 max-w-[40vw] -translate-x-1/2 -translate-y-1/2 truncate text-sm font-medium">
            {displayName}
          </span>

        <div className="flex items-center gap-2">
        {asset.type === "image" && source ? (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("lightbox.zoomOut")}
              onClick={zoom.zoomOut}
              className="rounded-full"
            >
              <Icon name="minus" className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("lightbox.zoomIn")}
              onClick={zoom.zoomIn}
              className="rounded-full"
            >
              <Icon name="plus" className="size-4" />
            </Button>
          </div>
        ) : null}
        <div className="panel flex items-center gap-0.5 rounded-md p-1 shadow-lg">
          {asset.motion && asset.type === "image" && motionSrc ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("lightbox.playMotion")}
              onClick={() => setPlayMotion((value) => !value)}
              className={cn("rounded-full", playMotion && "bg-muted")}
            >
              <IconLivePhoto className="size-5" />
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("lightbox.more")}
                  className="rounded-full"
                >
                  <IconDots className="size-5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={toggleFavourite}>
                <Icon name="favourites" className={cn(asset.isFavorite && "text-primary")} />
                {t("lightbox.favourite")}
              </DropdownMenuItem>
              {asset.type === "image" ? (
                <>
                  <DropdownMenuItem
                    onClick={() => {
                      if (asset.encrypted && !decryptedSrc) {
                        toast(t("lightbox.decrypting"))
                        return
                      }
                      setEditing(true)
                    }}
                  >
                    <Icon name="sliders" />
                    {t("lightbox.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyImage}>
                    <Icon name="duplicate" />
                    {t("lightbox.copy")}
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuItem onClick={() => setShareOpen(true)}>
                <Icon name="open-external" />
                {t("lightbox.share")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={download}>
                <Icon name="download" />
                {t("lightbox.download")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={moveToTrash}>
                <Icon name="trash" />
                {t("lightbox.moveToTrash")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tip label={t("lightbox.filmstrip")}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("lightbox.filmstrip")}
              onClick={toggleStrip}
              className={cn("rounded-full", showStrip && "bg-muted")}
            >
              <Icon name="photo" className="size-5" />
            </Button>
          </Tip>
          <span className="bg-border mx-0.5 h-5 w-px" />
          <Tip label={t("lightbox.info")}>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("lightbox.info")}
              onClick={toggleInfo}
              className={cn("rounded-full", info && "bg-muted")}
            >
              <Icon name="info" className="size-5" />
            </Button>
          </Tip>
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
              aria-label={t("lightbox.previous")}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onIndexChange(index - 1)}
              className="bg-background/30 hover:bg-background/50 border-border/40 absolute left-4 z-10 size-10 rounded-full border backdrop-blur-2xl shadow-lg"
            >
              <Icon name="nav-back" className="size-5" />
            </Button>
          ) : null}

          {asset.type === "video" && tooLargeToPreview ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 text-center">
              <p className="text-base font-medium text-white">{t("lightbox.tooLargeTitle")}</p>
              <p className="max-w-sm text-sm text-white/70">{t("lightbox.tooLargeBody")}</p>
              <Button onClick={download} className="mt-1">
                {t("lightbox.downloadToView")}
              </Button>
            </div>
          ) : asset.type === "video" ? (
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
            <p className="text-muted-foreground text-sm">{t("lightbox.stillProcessing")}</p>
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
              aria-label={t("lightbox.next")}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onIndexChange(index + 1)}
              className="bg-background/30 hover:bg-background/50 border-border/40 absolute right-4 z-10 size-10 rounded-full border backdrop-blur-2xl shadow-lg"
            >
              <Icon name="nav-forward" className="size-5" />
            </Button>
          ) : null}
        </div>

        <AnimatePresence initial={false}>
        {showStrip ? (
          <motion.div
            key="filmstrip"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
          <div className="flex justify-center px-4 pb-4">
            <div ref={stripRef} className="scrollbar-slim flex max-w-full gap-2 overflow-x-auto py-1">
              {assets.map((member, position) => (
                <button
                  key={member.id}
                  ref={position === index ? activeThumbRef : undefined}
                  type="button"
                  aria-label={t("lightbox.frame", { position: position + 1, total: assets.length })}
                  aria-current={position === index}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onIndexChange(position)}
                  className="shrink-0"
                >
                  <FilmstripThumb asset={member} active={position === index} />
                </button>
              ))}
            </div>
          </div>
          </motion.div>
        ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {info ? (
          <motion.aside
            key="info"
            className="relative z-10 shrink-0 overflow-hidden py-3 pr-3"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 368, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <div className="panel scrollbar-slim h-full w-[356px] overflow-hidden rounded-md">
              <InfoPanel
                assetId={asset.id}
                isFavorite={asset.isFavorite}
                onFavorite={toggleFavourite}
                onShare={() => setShareOpen(true)}
              />
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {editing && asset.type === "image" ? (
          <PhotoEditor
            key="editor"
            asset={asset}
            sourceUrl={asset.encrypted ? (decryptedSrc ?? "") : assetOriginalUrl(asset.id)}
            onClose={() => setEditing(false)}
            onSaved={refresh}
          />
        ) : null}
      </AnimatePresence>

      <ShareDialog
        name={displayName}
        open={shareOpen}
        onOpenChange={setShareOpen}
        createLink={(options) => sharePhoto(asset.id, options)}
        encryptKeyId={asset.encrypted ? asset.id : undefined}
      />
    </motion.div>
  )
}

export default Lightbox
