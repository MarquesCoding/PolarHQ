import {
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { decryptName } from "@workspace/core/e2e"
import { Icon } from "@workspace/screens/icons"
import type { GridAsset } from "@workspace/core/photos"
import {
  fetchDecryptedMotionVideo,
  fetchDecryptedPhotoOriginal,
  fetchDecryptedPhotoThumbnail,
} from "@workspace/core/photosE2e"
import { Heart, Image, Record, Stack } from "@phosphor-icons/react"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"

/**
 * Thumbnails that have decoded at least once this session. Virtualization
 * unmounts off-screen tiles; tracking this lets a remounted tile show its
 * (browser-cached) image immediately instead of flashing the gray placeholder.
 */
const loadedThumbnails = new Set<string>()

/** Session cache of decrypted thumbnail object URLs, shared with the stack filmstrip. */
export const decryptedThumbnails = new Map<string, string>()

const motionVideos = new Map<string, string>()

const formatDuration = (ms: number): string => {
  const total = Math.round(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

interface TileCorners {
  tl: boolean
  tr: boolean
  bl: boolean
  br: boolean
}

interface PhotoTileProps {
  asset: GridAsset
  rounded?: boolean
  /** Per-corner rounding (square grid) — rounds only the outer corners of the grid block. */
  corners?: TileCorners
  selected: boolean
  selectionActive: boolean
  animateIn?: boolean
  delay?: number
  onOpen: () => void
  onToggle: (shiftKey: boolean) => void
  onPreviewStart?: () => void
  onPreviewEnd?: () => void
}

const PhotoTile = ({
  asset,
  rounded = true,
  corners,
  selected,
  selectionActive,
  animateIn = false,
  delay = 0,
  onOpen,
  onToggle,
  onPreviewStart,
  onPreviewEnd,
}: PhotoTileProps) => {
  const { t } = useTranslation("photos")
  const [loaded, setLoaded] = useState(() => loadedThumbnails.has(asset.id))
  const [decryptedThumb, setDecryptedThumb] = useState<string | null>(() =>
    asset.encrypted ? (decryptedThumbnails.get(asset.id) ?? null) : null,
  )
  useEffect(() => {
    if (!asset.encrypted || !asset.thumbnailUrl || decryptedThumbnails.has(asset.id)) return
    let active = true
    void fetchDecryptedPhotoThumbnail(asset.id).then((result) => {
      if (!result) return
      decryptedThumbnails.set(asset.id, result)
      if (active) setDecryptedThumb(result)
    })
    return () => {
      active = false
    }
  }, [asset.id, asset.encrypted, asset.thumbnailUrl])

  const [motionUrl, setMotionUrl] = useState<string | null>(() => motionVideos.get(asset.id) ?? null)
  const [motionActive, setMotionActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canHoverPlay = asset.motion || asset.type === "video"

  const resolveHoverSource = (): Promise<string | null> => {
    if (asset.motion) return fetchDecryptedMotionVideo(asset.id)
    if (asset.encrypted) return fetchDecryptedPhotoOriginal(asset.id, asset.mimeType)
    return Promise.resolve(asset.videoUrl)
  }

  const startMotion = (event: ReactPointerEvent) => {
    if (!canHoverPlay || event.pointerType !== "mouse") return
    setMotionActive(true)
    if (motionUrl || motionVideos.has(asset.id)) return
    void resolveHoverSource().then((url) => {
      if (!url) return
      motionVideos.set(asset.id, url)
      setMotionUrl(url)
    })
  }
  const stopMotion = () => setMotionActive(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (motionActive) {
      video.currentTime = 0
      void video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }, [motionActive, motionUrl])

  const thumbSrc = asset.encrypted ? decryptedThumb : asset.thumbnailUrl
  const displayName = (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename
  const imgRef = useRef<HTMLImageElement | null>(null)
  const holdTimer = useRef<number | null>(null)
  const longPressed = useRef(false)
  const holdStart = useRef<{ x: number; y: number } | null>(null)
  const markLoaded = () => {
    loadedThumbnails.add(asset.id)
    setLoaded(true)
  }
  useLayoutEffect(() => {
    if (imgRef.current?.complete) markLoaded()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const activate = (shiftKey: boolean) => {
    if (selectionActive || shiftKey) onToggle(shiftKey)
    else onOpen()
  }

  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
  }
  const startHold = (event: ReactPointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    longPressed.current = false
    holdStart.current = { x: event.clientX, y: event.clientY }
    holdTimer.current = window.setTimeout(() => {
      longPressed.current = true
      onPreviewStart?.()
    }, 450)
  }
  const moveHold = (event: ReactPointerEvent) => {
    if (longPressed.current || !holdStart.current) return
    const moved = Math.hypot(event.clientX - holdStart.current.x, event.clientY - holdStart.current.y)
    if (moved > 10) cancelHold()
  }
  const endHold = () => {
    cancelHold()
    if (longPressed.current) onPreviewEnd?.()
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={displayName}
      initial={animateIn ? { opacity: 0, scale: 0.9, y: 10 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 0.61, 0.36, 1] }}
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerEnter={startMotion}
      onPointerLeave={() => {
        endHold()
        stopMotion()
      }}
      onPointerCancel={endHold}
      onPointerMove={moveHold}
      onContextMenu={(event) => event.preventDefault()}
      onClick={(event) => {
        if (longPressed.current) {
          longPressed.current = false
          return
        }
        activate(event.shiftKey)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          activate(event.shiftKey)
        }
      }}
      className={cn(
        "bg-muted border-foreground/10 group relative h-full w-full cursor-pointer overflow-hidden border outline-none transition focus-visible:outline-none",
        corners
          ? cn(
              corners.tl && "rounded-tl-lg",
              corners.tr && "rounded-tr-lg",
              corners.bl && "rounded-bl-lg",
              corners.br && "rounded-br-lg",
            )
          : rounded && "rounded-lg",
      )}
    >
      {thumbSrc ? (
        <motion.img
          ref={imgRef}
          layoutId={`photo-${asset.id}`}
          src={thumbSrc}
          alt={displayName}
          loading="lazy"
          onLoad={markLoaded}
          transition={{ duration: 0 }}
          className={cn(
            "h-full w-full object-cover transition duration-500 group-hover:brightness-95",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      ) : asset.type === "audio" ? (
        <div className="text-muted-foreground flex h-full w-full items-center justify-center">
          <Icon name="music" className="size-8" />
        </div>
      ) : (
        <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-1">
          <Image className="size-5" />
          {asset.status === "failed" ? (
            <span className="text-[10px]">{t("photoTile.failed")}</span>
          ) : asset.status === "processing" || asset.status === "uploading" ? (
            <span className="text-[10px]">{t("photoTile.processing")}</span>
          ) : null}
        </div>
      )}

      {selected ? (
        <span className="ring-primary pointer-events-none absolute inset-0 z-10 rounded-[inherit] ring-2 ring-inset" />
      ) : null}

      {canHoverPlay && motionUrl ? (
        <video
          ref={videoRef}
          src={motionUrl}
          muted
          loop
          playsInline
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            motionActive ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}

      {asset.motion ? (
        <span
          className={cn(
            "pointer-events-none absolute right-1.5 top-1.5 text-white drop-shadow transition-opacity",
            motionActive ? "opacity-0" : "opacity-100",
          )}
        >
          <Record className="size-4" />
        </span>
      ) : null}

      {asset.type === "video" ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity",
            motionActive ? "opacity-0" : "opacity-100",
          )}
        >
          <Icon name="play" className="size-9 text-white/90 drop-shadow-md" />
        </span>
      ) : null}

      {asset.durationMs ? (
        <span className="absolute right-1.5 bottom-1.5 rounded bg-black/55 px-1 py-0.5 text-[10px] font-medium text-white tabular-nums">
          {formatDuration(asset.durationMs)}
        </span>
      ) : null}

      {asset.stackCount > 1 && !asset.motion ? (
        <span className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums drop-shadow">
          <Stack className="size-3" />
          {asset.stackCount}
        </span>
      ) : null}


      {asset.isFavorite ? (
        <Heart weight="fill" className="absolute bottom-1.5 left-1.5 size-4 text-white drop-shadow" />
      ) : null}
    </motion.div>
  )
}

export default PhotoTile
