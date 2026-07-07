import { type PointerEvent as ReactPointerEvent, memo, useEffect, useRef, useState } from "react"
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
import { clearFocusedImage, setFocusedImage } from "@components/adaptiveChrome"
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
  fadingOut: boolean
  revealing: boolean
  zoom: number
  panX: number
  panY: number
  animate: boolean
  z: number
  draggable: boolean
  onOpen: () => void
  onToggle: (shiftKey: boolean) => void
  onPan: (dx: number, dy: number) => void
  onDragCommit: (dx: number, dy: number) => void
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
  fadingOut,
  revealing,
  zoom,
  panX,
  panY,
  animate,
  z,
  draggable,
  onOpen,
  onToggle,
  onPan,
  onDragCommit,
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
    // Defer the (main-thread) decrypt until after the open animation so it doesn't block/jank it —
    // the thumbnail is shown meanwhile, then the original swaps in and sharpens.
    const timer = setTimeout(() => {
      void fetchCachedOriginal(asset.id, asset.mimeType).then((url) => {
        if (active && url) setOriginal(url)
      })
    }, 420)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [focused, asset.id, asset.encrypted, asset.mimeType, asset.type, asset.previewUrl])
  const displaySrc = focused ? (original ?? thumb) : thumb

  const [motionUrl, setMotionUrl] = useState<string | null>(() => motionCache.get(asset.id) ?? null)
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
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

  useEffect(() => {
    if (focused && canPlay) hover()
    else if (canPlay) setPlaying(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, canPlay])

  // Publish the on-screen focused image so each floating chrome element can sample the region behind
  // it and contrast that in real time.
  useEffect(() => {
    if (!focused) return
    setFocusedImage(imgRef.current)
    return () => clearFocusedImage(imgRef.current)
  }, [focused])

  const name = (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename
  const dragged = useRef(false)
  const downAt = useRef<{ x: number; y: number } | null>(null)
  const panLast = useRef<{ x: number; y: number } | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dragging = dragStart.current !== null

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={name}
      initial={false}
      animate={{
        x: rect.x + dragOffset.x,
        y: rect.y + dragOffset.y,
        width: rect.w,
        height: rect.h,
        opacity: fadingOut ? 0 : revealing ? [0, 1] : dimmed ? 0.5 : 1,
      }}
      transition={{
        default: dragging
          ? { duration: 0 }
          : animate
            ? { type: "spring", bounce: 0.2, duration: 0.4 }
            : { duration: 0 },
        opacity: { duration: fadingOut ? 0.3 : 0.4, ease: EASE },
      }}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        zIndex: z,
        contain: focused ? "layout" : "layout paint",
        willChange: dimmed || focused ? "transform" : undefined,
      }}
      onPointerDown={(event) => {
        if (focused && zoom > 1) {
          panLast.current = { x: event.clientX, y: event.clientY }
          event.currentTarget.setPointerCapture(event.pointerId)
          return
        }
        downAt.current = { x: event.clientX, y: event.clientY }
        dragged.current = false
        if (draggable) {
          dragStart.current = { x: event.clientX, y: event.clientY }
          event.currentTarget.setPointerCapture(event.pointerId)
        }
      }}
      onPointerMove={(event) => {
        if (panLast.current) {
          onPan(event.clientX - panLast.current.x, event.clientY - panLast.current.y)
          panLast.current = { x: event.clientX, y: event.clientY }
          return
        }
        if (dragStart.current) {
          const dx = event.clientX - dragStart.current.x
          const dy = event.clientY - dragStart.current.y
          if (Math.hypot(dx, dy) > 6) dragged.current = true
          setDragOffset({ x: dx, y: dy })
          return
        }
        if (
          downAt.current &&
          Math.hypot(event.clientX - downAt.current.x, event.clientY - downAt.current.y) > 6
        )
          dragged.current = true
      }}
      onPointerUp={() => {
        panLast.current = null
        if (dragStart.current) {
          if (dragged.current) onDragCommit(dragOffset.x, dragOffset.y)
          dragStart.current = null
          setDragOffset({ x: 0, y: 0 })
        }
      }}
      onPointerEnter={hover}
      onPointerLeave={() => {
        if (!focused) setPlaying(false)
      }}
      onClick={(event) => {
        if (dragged.current || focused) return
        if (selectionActive || event.shiftKey) onToggle(event.shiftKey)
        else onOpen()
      }}
      className={cn(
        "group absolute outline-none",
        !focused && !draggable && "cursor-pointer",
        draggable && (dragging ? "cursor-grabbing" : "cursor-grab"),
        focused && zoom > 1 && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div
        className={cn(
          "bg-muted relative h-full w-full overflow-hidden",
          focused ? "rounded-2xl" : "rounded-lg",
        )}
        style={{
          transform: focused ? `translate(${panX}px, ${panY}px) scale(${zoom})` : undefined,
          transformOrigin: "center",
          willChange: focused ? "transform" : undefined,
        }}
      >
      {displaySrc ? (
        <img
          ref={imgRef}
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
          muted={!focused}
          loop={!focused}
          playsInline
          controls={focused}
          className={cn(
            "absolute inset-0 h-full w-full transition-opacity duration-300",
            focused ? "object-contain" : "pointer-events-none object-cover",
            playing || focused ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}

      {selected && !focused ? (
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

      {asset.isFavorite && !focused ? (
        <Heart weight="fill" className="absolute bottom-1.5 left-1.5 size-4 text-white drop-shadow" />
      ) : null}
      </div>
    </motion.div>
  )
}

export default memo(
  AssetEntity,
  (a, b) =>
    a.asset === b.asset &&
    a.rect.x === b.rect.x &&
    a.rect.y === b.rect.y &&
    a.rect.w === b.rect.w &&
    a.rect.h === b.rect.h &&
    a.selected === b.selected &&
    a.selectionActive === b.selectionActive &&
    a.dimmed === b.dimmed &&
    a.focused === b.focused &&
    a.fadingOut === b.fadingOut &&
    a.zoom === b.zoom &&
    a.panX === b.panX &&
    a.panY === b.panY &&
    a.animate === b.animate &&
    a.z === b.z &&
    a.draggable === b.draggable &&
    a.revealing === b.revealing,
)
