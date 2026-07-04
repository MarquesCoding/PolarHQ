import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react"
import { decryptName } from "@workspace/core/e2e"
import { Icon } from "@workspace/screens/icons"
import {
  fetchDecryptedMotionVideo,
  fetchDecryptedPhotoOriginal,
  fetchDecryptedPhotoThumbnail,
} from "@workspace/core/photosE2e"
import { Heart, Record, Stack } from "@phosphor-icons/react"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"
import { fetchCachedOriginal } from "@pages/Photos/components/Lightbox/originalCache"
import type { GridAsset, Rect } from "./types"

const loaded = new Set<string>()
/** Session cache of decrypted thumbnail object URLs so a re-mounted entity shows instantly. */
export const thumbnailCache = new Map<string, string>()
const motionCache = new Map<string, string>()

const formatDuration = (ms: number): string => {
  const total = Math.round(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

interface AssetEntityProps {
  asset: GridAsset
  rect: Rect
  selected: boolean
  selectionActive: boolean
  dimmed: boolean
  focused: boolean
  animate: boolean
  z: number
  onOpen: () => void
  onToggle: (shiftKey: boolean) => void
}

const EASE = [0.32, 0.72, 0, 1] as const

/**
 * The one and only representation of an asset — the same element in grid, canvas, infinity and the
 * focused viewer. Given a world rect it decodes its own thumbnail and animates into place; because it
 * never unmounts across states, every transition is a single continuous tween.
 */
const AssetEntity = ({
  asset,
  rect,
  selected,
  selectionActive,
  dimmed,
  focused,
  animate,
  z,
  onOpen,
  onToggle,
}: AssetEntityProps) => {
  const [thumb, setThumb] = useState<string | null>(() =>
    asset.encrypted ? (thumbnailCache.get(asset.id) ?? null) : asset.thumbnailUrl,
  )
  const [isLoaded, setLoaded] = useState(() => loaded.has(asset.id))
  useEffect(() => {
    if (!asset.encrypted || thumbnailCache.has(asset.id) || !asset.thumbnailUrl) return
    let active = true
    void fetchDecryptedPhotoThumbnail(asset.id).then((url) => {
      if (!url) return
      thumbnailCache.set(asset.id, url)
      if (active) setThumb(url)
    })
    return () => {
      active = false
    }
  }, [asset.id, asset.encrypted, asset.thumbnailUrl])

  const [original, setOriginal] = useState<string | null>(null)
  useEffect(() => {
    if (!focused || asset.type !== "image") return
    if (!asset.encrypted) {
      setOriginal(asset.previewUrl ?? null)
      return
    }
    let active = true
    void fetchCachedOriginal(asset.id, asset.mimeType).then((url) => {
      if (active && url) setOriginal(url)
    })
    return () => {
      active = false
    }
  }, [focused, asset.id, asset.encrypted, asset.mimeType, asset.type, asset.previewUrl])
  const displaySrc = focused ? (original ?? thumb) : thumb

  const [motionUrl, setMotionUrl] = useState<string | null>(() => motionCache.get(asset.id) ?? null)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canPlay = asset.motion || asset.type === "video"

  const hover = () => {
    if (!canPlay) return
    setPlaying(true)
    if (motionUrl || motionCache.has(asset.id)) return
    const resolve = asset.motion
      ? fetchDecryptedMotionVideo(asset.id)
      : asset.encrypted
        ? fetchDecryptedPhotoOriginal(asset.id, asset.mimeType)
        : Promise.resolve(asset.videoUrl)
    void resolve.then((url) => {
      if (!url) return
      motionCache.set(asset.id, url)
      setMotionUrl(url)
    })
  }
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (playing) {
      video.currentTime = 0
      void video.play().catch(() => undefined)
    } else video.pause()
  }, [playing, motionUrl])

  const name = (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename
  const dragged = useRef(false)

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={name}
      initial={false}
      animate={{ x: rect.x, y: rect.y, width: rect.w, height: rect.h, opacity: dimmed ? 0.55 : 1 }}
      transition={{
        default: animate ? { duration: 0.45, ease: EASE } : { duration: 0 },
        opacity: { duration: focused ? 0.2 : 0.35, ease: EASE },
      }}
      style={{ position: "absolute", left: 0, top: 0, zIndex: z, filter: dimmed ? "blur(16px) saturate(0.6)" : undefined }}
      onPointerDown={() => {
        dragged.current = false
      }}
      onPointerMove={() => {
        dragged.current = true
      }}
      onPointerEnter={hover}
      onPointerLeave={() => setPlaying(false)}
      onClick={(event) => {
        if (dragged.current) return
        if (selectionActive || event.shiftKey) onToggle(event.shiftKey)
        else onOpen()
      }}
      className={cn(
        "bg-muted group absolute overflow-hidden rounded-lg outline-none",
        !focused && "cursor-pointer",
      )}
    >
      {displaySrc ? (
        <img
          src={displaySrc}
          alt={name}
          loading="lazy"
          draggable={false}
          onLoad={() => {
            loaded.add(asset.id)
            setLoaded(true)
          }}
          className={cn(
            "h-full w-full transition-opacity duration-500",
            focused ? "object-contain" : "object-cover",
            isLoaded || focused ? "opacity-100" : "opacity-0",
          )}
        />
      ) : asset.type === "audio" ? (
        <div className="text-muted-foreground flex h-full w-full items-center justify-center">
          <Icon name="music" className="size-8" />
        </div>
      ) : null}

      {canPlay && motionUrl ? (
        <video
          ref={videoRef}
          src={motionUrl}
          muted
          loop
          playsInline
          className={cn(
            "pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            playing ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}

      {selected ? (
        <span className="ring-primary pointer-events-none absolute inset-0 z-10 rounded-[inherit] ring-2 ring-inset" />
      ) : null}

      {asset.type === "video" ? (
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity",
            playing ? "opacity-0" : "opacity-100",
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

      {asset.motion ? (
        <span className="pointer-events-none absolute top-1.5 right-1.5 text-white drop-shadow">
          <Record className="size-4" />
        </span>
      ) : asset.stackCount > 1 ? (
        <span className="pointer-events-none absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums drop-shadow">
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

export default AssetEntity
