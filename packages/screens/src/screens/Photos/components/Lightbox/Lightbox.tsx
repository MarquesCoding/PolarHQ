import { type ReactElement, useEffect, useLayoutEffect, useRef, useState } from "react"
import { usePersistentNumber } from "@workspace/screens/persistentSetting"
import { useZoomPan } from "@workspace/screens/useZoomPan"
import {
  Aperture,
  ArrowLeft,
  ArrowSquareOut,
  CaretLeft,
  CaretRight,
  Copy,
  DotsThree,
  DownloadSimple,
  Heart,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  SidebarSimple,
  Slideshow,
  Sliders,
  Trash,
  X,
} from "@phosphor-icons/react"
import EditPanel from "@pages/Photos/components/PhotoEditor/EditPanel"
import EditStage from "@pages/Photos/components/PhotoEditor/EditStage"
import { usePhotoEditor } from "@pages/Photos/components/PhotoEditor/usePhotoEditor"
import MediaPlayer from "@pages/Photos/components/MediaPlayer/MediaPlayer"
import PhotoContextMenu, {
  type PhotoMenuActions,
} from "@pages/Photos/components/PhotoContextMenu/PhotoContextMenu"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
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
import { AnimatePresence, motion, useAnimationControls, usePresence } from "motion/react"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import type { ViewerController, ViewerItem } from "./viewer"
import { decryptedThumbnails } from "@pages/Photos/components/PhotoTile/PhotoTile"

interface LightboxProps {
  /** The data layer the viewer renders against (Photos or Drive supplies one). */
  controller: ViewerController
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  /** The clicked tile's screen rect, so the photo can zoom out of (and back into) its grid cell. */
  originRect?: DOMRect | null
  /** Show a thumbnail strip of every item along the bottom — used for stack/burst viewing. */
  filmstrip?: boolean
}

/** A toolbar button with a hover tooltip (the buttons are icon-only and otherwise ambiguous). */
const Tip = ({ label, children }: { label: string; children: ReactElement }) => (
  <Tooltip>
    <TooltipTrigger render={children} />
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
)

/** A single filmstrip thumbnail; the controller resolves encrypted thumbnails (and caches them). */
const FilmstripThumb = ({
  item,
  active,
  fetchThumb,
}: {
  item: ViewerItem
  active: boolean
  fetchThumb: (item: ViewerItem) => Promise<string | null>
}) => {
  const [src, setSrc] = useState<string | null>(() =>
    item.encrypted ? null : (item.thumbnailUrl ?? null),
  )
  useEffect(() => {
    if (!item.encrypted) {
      setSrc(item.thumbnailUrl ?? null)
      return
    }
    let on = true
    void fetchThumb(item).then((result) => {
      if (on && result) setSrc(result)
    })
    return () => {
      on = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.encrypted, item.thumbnailUrl])

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

const Lightbox = ({
  controller,
  index,
  onIndexChange,
  onClose,
  originRect,
  filmstrip,
}: LightboxProps) => {
  const { t } = useTranslation("photos")
  const { items } = controller

  // Hero FLIP: zoom the photo out of its grid tile on open, and back into it on close. The photo
  // renders in a portal above the (blurred, scaled) grid, so it stays sharp throughout. We compute
  // where object-contain *will* place the photo from the stage size + the known aspect ratio, so it
  // works even though the encrypted image hasn't decrypted/loaded yet at open time.
  const stageRef = useRef<HTMLDivElement>(null)
  const flipControls = useAnimationControls()
  const flipFrom = useRef<{ x: number; y: number; scale: number } | null>(null)
  const flipEase = { duration: 0.42, ease: [0.32, 0.72, 0, 1] as const }
  const didOpenRef = useRef(false)
  const [isPresent, safeToRemove] = usePresence()

  useLayoutEffect(() => {
    if (didOpenRef.current) return // only animate on the initial open, not on next/prev navigation
    const stage = stageRef.current
    const opened = items[index]
    if (!stage || !originRect) return
    const box = stage.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) return
    didOpenRef.current = true
    const aspect =
      opened?.width && opened?.height ? opened.width / opened.height : box.width / box.height
    let dispW = box.width
    if (dispW / aspect > box.height) dispW = box.height * aspect
    flipFrom.current = {
      x: originRect.left + originRect.width / 2 - (box.left + box.width / 2),
      y: originRect.top + originRect.height / 2 - (box.top + box.height / 2),
      scale: originRect.width / dispW,
    }
    flipControls.set(flipFrom.current)
    void flipControls.start({ x: 0, y: 0, scale: 1, transition: flipEase })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originRect])

  useEffect(() => {
    if (isPresent) return
    const from = flipFrom.current
    if (!from) {
      safeToRemove()
      return
    }
    void flipControls.start({ ...from, transition: flipEase }).then(() => safeToRemove())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent])
  const [infoPref, setInfoPref] = usePersistentNumber("photos.lightboxDetails", 0)
  const info = infoPref === 1
  const toggleInfo = () => setInfoPref(info ? 0 : 1)
  const [stripPref, setStripPref] = usePersistentNumber("photos.lightboxFilmstrip", 0)
  const showStrip = (filmstrip || stripPref === 1) && items.length > 1
  const toggleStrip = () => setStripPref(stripPref ? 0 : 1)
  const deleteArmed = useRef(false)
  const [isEditing, setEditing] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const exitEditingRef = useRef<() => void>(() => {})
  const [shareOpen, setShareOpen] = useState(false)
  const item = items[index]
  const tooLargeToPreview =
    !!item?.encrypted && item.kind === "video" && item.sizeBytes > PLAYABLE_ENCRYPTED_MAX
  const zoom = useZoomPan(item?.id)
  const activeThumbRef = useRef<HTMLButtonElement | null>(null)
  const stripRef = useRef<HTMLDivElement | null>(null)

  // Lock the page behind the fullscreen viewer so the content underneath can't scroll.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

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
    if (!item) onClose()
  }, [item, onClose])

  useEffect(() => {
    if (!controller.trash) return
    const onKey = (event: KeyboardEvent) => {
      if (!item || !event.shiftKey || event.key.toLowerCase() !== "d") return
      event.preventDefault()
      if (deleteArmed.current) {
        deleteArmed.current = false
        void controller.trash?.(item).then(() => {
          if (items.length <= 1) onClose()
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, items.length, index, onClose, onIndexChange])

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
        if (confirmDiscard) return
        if (isEditing) exitEditingRef.current()
        else onClose()
      } else if (event.key === "ArrowLeft" && index > 0 && !isEditing) {
        onIndexChange(index - 1)
      } else if (event.key === "ArrowRight" && index < items.length - 1 && !isEditing) {
        onIndexChange(index + 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [index, items.length, onClose, onIndexChange, isEditing, confirmDiscard])

  if (!item) return null

  const toggleFavourite = async () => {
    if (!controller.toggleFavorite) return
    await controller.toggleFavorite(item).catch(() => undefined)
  }

  const moveToTrash = async () => {
    if (!controller.trash) return
    await controller.trash(item).catch(() => undefined)
    if (items.length <= 1) onClose()
    else onIndexChange(index > 0 ? index - 1 : index + 1)
  }

  const download = () => controller.download?.(item)

  const copyImage = async () => {
    if (item.kind !== "image") return
    const toPng = async (): Promise<Blob> => {
      const url = item.encrypted
        ? (decryptedSrc ?? (await controller.fetchOriginal(item)))
        : (item.originalUrl ?? item.previewUrl ?? null)
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
    if (!item.encrypted || tooLargeToPreview) {
      setDecryptedSrc(null)
      return
    }
    let active = true
    // Reset so the previous photo doesn't linger; the thumbnail shows while the original decrypts.
    setDecryptedSrc(null)
    // The cache owns the object URL (revoked on LRU eviction), so we don't revoke it here — that's
    // what made revisits re-download + re-decrypt the full original every time.
    void controller.fetchOriginal(item).then((result) => {
      if (active) setDecryptedSrc(result)
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.encrypted, item.mimeType, tooLargeToPreview])

  // Prefetch the neighbouring originals (into the same cache) so next/prev is instant.
  useEffect(() => {
    for (const neighbour of [items[index + 1], items[index - 1]]) {
      if (neighbour?.encrypted && neighbour.kind === "image") {
        void controller.fetchOriginal(neighbour).catch(() => undefined)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items])

  const canEdit = !!controller.editing && item.kind === "image"
  const editing = isEditing && canEdit
  const editor = usePhotoEditor({
    baseName: item.name.replace(/\.[^.]+$/, ""),
    sourceUrl: item.encrypted ? (decryptedSrc ?? "") : (item.originalUrl ?? ""),
    enabled: editing,
    onSave: async (file) => {
      await controller.editing?.save(item, file)
    },
    onClose: () => setEditing(false),
  })
  const requestExitEditing = () => {
    if (editor.dirty) setConfirmDiscard(true)
    else setEditing(false)
  }
  useEffect(() => {
    exitEditingRef.current = requestExitEditing
  })

  const source = item.encrypted
    ? (decryptedSrc ?? decryptedThumbnails.get(item.id) ?? undefined)
    : (item.previewUrl ?? item.thumbnailUrl ?? undefined)

  const canPlayMotion = !!item.motion && !!controller.fetchMotion
  const [motionSrc, setMotionSrc] = useState<string | null>(null)
  const [playMotion, setPlayMotion] = useState(false)
  useEffect(() => {
    setPlayMotion(false)
    setMotionSrc(null)
    if (!canPlayMotion) return
    let active = true
    let url: string | null = null
    void controller.fetchMotion?.(item).then((result) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, canPlayMotion])

  const shareConfig = controller.share?.(item)
  const infoOpen = controller.renderInfo ? info : false

  const menuActions: PhotoMenuActions = {
    favorite: controller.toggleFavorite
      ? { active: Boolean(item.isFavorite), toggle: () => void toggleFavourite() }
      : undefined,
    edit: canEdit && !editing ? () => setEditing(true) : undefined,
    share: shareConfig ? () => setShareOpen(true) : undefined,
    download: controller.download ? download : undefined,
    copy: item.kind === "image" ? () => void copyImage() : undefined,
    info: controller.renderInfo ? toggleInfo : undefined,
    trash: controller.trash ? () => void moveToTrash() : undefined,
  }

  return (
    <div
      // Transparent — the actual blur/scale/desaturate happens on the grid itself (behind this, in
      // PhotoGrid), so this just holds the sharp, floating photo and its chrome. Click to close.
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-10"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={editing ? undefined : onClose}
    >
      <div
        className="relative flex h-full max-h-[92vh] w-full max-w-[1600px] overflow-visible"
        onClick={(event) => event.stopPropagation()}
      >
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative flex items-center justify-between gap-2 p-3">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={editing ? t("photoEditor.closeEditor") : t("lightbox.close")}
            onClick={editing ? requestExitEditing : onClose}
            className="rounded-full"
          >
            {editing ? <ArrowLeft className="size-5" /> : <X className="size-5" />}
          </Button>
          <span className="pointer-events-none absolute top-1/2 left-1/2 max-w-[40vw] -translate-x-1/2 -translate-y-1/2 truncate text-sm font-medium">
            {item.name}
          </span>

        {!editing ? (
        <div className="flex items-center gap-2">
        {item.kind === "image" && source ? (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("lightbox.zoomOut")}
              onClick={zoom.zoomOut}
              className="rounded-full"
            >
              <MagnifyingGlassMinus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("lightbox.zoomIn")}
              onClick={zoom.zoomIn}
              className="rounded-full"
            >
              <MagnifyingGlassPlus className="size-4" />
            </Button>
          </div>
        ) : null}
        <div className="flex items-center gap-0.5">
          {canPlayMotion && item.kind === "image" && motionSrc ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("lightbox.playMotion")}
              onClick={() => setPlayMotion((value) => !value)}
              className={cn("rounded-full", playMotion && "bg-muted")}
            >
              <Aperture className="size-5" />
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
                  <DotsThree className="size-5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {controller.toggleFavorite ? (
                <DropdownMenuItem onClick={toggleFavourite}>
                  <Heart weight={item.isFavorite ? "fill" : "regular"} />
                  {t("lightbox.favourite")}
                </DropdownMenuItem>
              ) : null}
              {item.kind === "image" ? (
                <>
                  {canEdit ? (
                    <DropdownMenuItem
                      onClick={() => {
                        if (item.encrypted && !decryptedSrc) {
                          toast(t("lightbox.decrypting"))
                          return
                        }
                        setEditing(true)
                      }}
                    >
                      <Sliders />
                      {t("lightbox.edit")}
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem onClick={copyImage}>
                    <Copy />
                    {t("lightbox.copy")}
                  </DropdownMenuItem>
                </>
              ) : null}
              {shareConfig ? (
                <DropdownMenuItem onClick={() => setShareOpen(true)}>
                  <ArrowSquareOut />
                  {t("lightbox.share")}
                </DropdownMenuItem>
              ) : null}
              {controller.download ? (
                <DropdownMenuItem onClick={download}>
                  <DownloadSimple />
                  {t("lightbox.download")}
                </DropdownMenuItem>
              ) : null}
              {controller.trash ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={moveToTrash}>
                    <Trash />
                    {t("lightbox.moveToTrash")}
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          {items.length > 1 ? (
            <Tip label={t("lightbox.filmstrip")}>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("lightbox.filmstrip")}
                onClick={toggleStrip}
                className="rounded-full"
              >
                <Slideshow weight={showStrip ? "fill" : "regular"} className="size-5" />
              </Button>
            </Tip>
          ) : null}
          {controller.renderInfo ? (
            <>
              <span className="bg-border mx-0.5 h-5 w-px" />
              <Tip label={t("lightbox.info")}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("lightbox.info")}
                  onClick={toggleInfo}
                  className="rounded-full"
                >
                  <SidebarSimple weight={infoOpen ? "fill" : "regular"} className="size-5" />
                </Button>
              </Tip>
            </>
          ) : null}
        </div>
        </div>
        ) : null}
      </div>

        <PhotoContextMenu actions={menuActions}>
        <div
          ref={zoom.stageRef}
          className={cn(
            "relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden p-6 sm:p-10",
            item.kind === "image" && !editing && "touch-none",
            item.kind === "image" && !editing && zoom.canPan && "cursor-grab active:cursor-grabbing",
          )}
          onPointerDown={item.kind === "image" && !editing ? zoom.stageHandlers.onPointerDown : undefined}
          onPointerMove={item.kind === "image" && !editing ? zoom.stageHandlers.onPointerMove : undefined}
          onPointerUp={item.kind === "image" && !editing ? zoom.stageHandlers.onPointerUp : undefined}
          onPointerCancel={item.kind === "image" && !editing ? zoom.stageHandlers.onPointerCancel : undefined}
        >
          {index > 0 && !editing ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("lightbox.previous")}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onIndexChange(index - 1)}
              className="bg-background/30 hover:bg-background/50 border-border/40 absolute left-4 z-10 size-10 rounded-full border backdrop-blur-2xl shadow-lg"
            >
              <CaretLeft className="size-5" />
            </Button>
          ) : null}

          {item.kind === "video" && tooLargeToPreview ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-8 text-center">
              <p className="text-base font-medium text-white">{t("lightbox.tooLargeTitle")}</p>
              <p className="max-w-sm text-sm text-white/70">{t("lightbox.tooLargeBody")}</p>
              <Button onClick={download} className="mt-1">
                {t("lightbox.downloadToView")}
              </Button>
            </div>
          ) : item.kind === "video" ? (
            <MediaPlayer
              key={item.id}
              kind="video"
              src={item.encrypted ? (decryptedSrc ?? "") : (item.videoUrl ?? "")}
              poster={item.encrypted ? undefined : (item.previewUrl ?? undefined)}
            />
          ) : item.kind === "audio" ? (
            <MediaPlayer
              key={item.id}
              kind="audio"
              src={item.encrypted ? (decryptedSrc ?? "") : (item.originalUrl ?? "")}
              name={item.name}
            />
          ) : editing ? (
            <EditStage controller={editor} />
          ) : source ? (
            <motion.div
              ref={stageRef}
              className="flex h-full w-full items-center justify-center"
              animate={{ scale: zoom.scale, x: zoom.offset.x, y: zoom.offset.y }}
              transition={{ duration: 0.1, ease: "easeOut" }}
            >
              <motion.img
                animate={flipControls}
                src={source}
                alt={item.name}
                draggable={false}
                className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
                style={{
                  transformOrigin: "center",
                  backgroundImage:
                    !item.encrypted && item.thumbnailUrl
                      ? `url(${item.thumbnailUrl})`
                      : undefined,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                }}
              />
            </motion.div>
          ) : (
            <p className="text-muted-foreground text-sm">{t("lightbox.stillProcessing")}</p>
          )}

          {item.kind === "image" && playMotion && motionSrc && !editing ? (
            <video
              key={`motion-${item.id}`}
              src={motionSrc}
              autoPlay
              muted
              loop
              playsInline
              onEnded={() => setPlayMotion(false)}
              className="absolute inset-0 z-10 m-auto max-h-full max-w-full rounded-2xl object-contain p-6 sm:p-10"
            />
          ) : null}

          {index < items.length - 1 && !editing ? (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("lightbox.next")}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onIndexChange(index + 1)}
              className="bg-background/30 hover:bg-background/50 border-border/40 absolute right-4 z-10 size-10 rounded-full border backdrop-blur-2xl shadow-lg"
            >
              <CaretRight className="size-5" />
            </Button>
          ) : null}
        </div>
        </PhotoContextMenu>

        <AnimatePresence initial={false}>
        {showStrip && !editing ? (
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
              {items.map((member, position) => (
                <button
                  key={member.id}
                  ref={position === index ? activeThumbRef : undefined}
                  type="button"
                  aria-label={t("lightbox.frame", { position: position + 1, total: items.length })}
                  aria-current={position === index}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onIndexChange(position)}
                  className="shrink-0"
                >
                  <FilmstripThumb
                    item={member}
                    active={position === index}
                    fetchThumb={controller.fetchThumbnail}
                  />
                </button>
              ))}
            </div>
          </div>
          </motion.div>
        ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {infoOpen || editing ? (
          <motion.aside
            key="aside"
            className="border-border/60 bg-card relative z-10 h-full shrink-0 overflow-hidden border-l"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: editing ? 360 : 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
          >
            <div className="relative h-full" style={{ width: editing ? 360 : 340 }}>
              <AnimatePresence mode="wait" initial={false}>
                {editing ? (
                  <motion.div
                    key="edit"
                    className="absolute inset-0"
                    initial={{ x: 32, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 32, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <EditPanel controller={editor} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="info"
                    className="absolute inset-0 overflow-hidden"
                    initial={{ x: -32, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -32, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {controller.renderInfo?.(item, {
                      onFavorite: controller.toggleFavorite ? toggleFavourite : undefined,
                      onShare: shareConfig ? () => setShareOpen(true) : undefined,
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        ) : null}
      </AnimatePresence>
      </div>

      {shareConfig ? (
        <ShareDialog
          name={item.name}
          open={shareOpen}
          onOpenChange={setShareOpen}
          createLink={shareConfig.createLink}
          encryptKeyId={shareConfig.encryptKeyId}
        />
      ) : null}

      <Dialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <DialogContent showCloseButton={false} className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("photoEditor.discardTitle")}</DialogTitle>
            <DialogDescription>{t("photoEditor.discardBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {t("photoEditor.keepEditing")}
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmDiscard(false)
                setEditing(false)
              }}
            >
              {t("photoEditor.discardConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Lightbox
