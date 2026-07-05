import { fetchDecryptedPhotoThumbnail } from "@workspace/core/photosE2e"
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react"
import { thumbnailCache } from "./AssetEntity"
import BottomChrome from "./BottomChrome"
import type { GridAsset, Mode, Rect } from "./types"

const WORLD_WIDTH = 2400
const TILE = 150
const GAP = 14
const MIN_ZOOM = 0.45
const MAX_ZOOM = 3.5
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const aspectOf = (asset: GridAsset): number =>
  clamp(asset.width && asset.height ? asset.width / asset.height : 1, 0.4, 3)

/** Continuous justified flow (aspect-preserved, no day breaks) across a fixed-width world. */
const justify = (assets: GridAsset[]): { rects: Map<string, Rect>; height: number } => {
  const rects = new Map<string, Rect>()
  let row: GridAsset[] = []
  let aspectSum = 0
  let y = 0
  const flush = (stretch: boolean) => {
    if (row.length === 0) return
    const gaps = (row.length - 1) * GAP
    const h = stretch ? (WORLD_WIDTH - gaps) / aspectSum : TILE
    let x = 0
    for (const asset of row) {
      const w = h * aspectOf(asset)
      rects.set(asset.id, { x, y, w, h })
      x += w + GAP
    }
    y += h + GAP
    row = []
    aspectSum = 0
  }
  for (const asset of assets) {
    row.push(asset)
    aspectSum += aspectOf(asset)
    if (aspectSum * TILE + (row.length - 1) * GAP >= WORLD_WIDTH) flush(true)
  }
  flush(false)
  return { rects, height: y }
}

const useThumb = (asset: GridAsset): string | null => {
  const [url, setUrl] = useState<string | null>(() =>
    asset.encrypted ? (thumbnailCache.get(asset.id) ?? null) : (asset.thumbnailUrl ?? null),
  )
  useEffect(() => {
    if (!asset.encrypted) return
    if (thumbnailCache.has(asset.id)) {
      setUrl(thumbnailCache.get(asset.id) ?? null)
      return
    }
    let active = true
    void fetchDecryptedPhotoThumbnail(asset.id).then((u) => {
      if (!u) return
      thumbnailCache.set(asset.id, u)
      if (active) setUrl(u)
    })
    return () => {
      active = false
    }
  }, [asset.id, asset.encrypted, asset.thumbnailUrl])
  return url
}

const Tile = ({ asset, x, y, w, h, onClick }: { asset: GridAsset; x: number; y: number; w: number; h: number; onClick: () => void }) => {
  const url = useThumb(asset)
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-muted absolute overflow-hidden rounded-md ring-0 transition hover:ring-2 hover:ring-white/60"
      style={{ left: x, top: y, width: w, height: h }}
    >
      {url ? <img src={url} alt="" draggable={false} className="size-full object-cover" /> : null}
    </button>
  )
}

interface InfinityPlaneProps {
  assets: GridAsset[]
  mode: Mode
  onMode: (mode: Mode) => void
}

/**
 * Infinity: a freely pannable + zoomable plane. Photos are laid out on a fixed-width world grid; a
 * camera (translate + scale) lets you drag to pan, wheel to pan, and pinch/ctrl-wheel to zoom around
 * the cursor. Only the tiles intersecting the camera viewport render (plain divs — no motion), so the
 * whole library stays cheap however far you zoom out. Clicking a tile dives into it in Grid mode.
 */
const InfinityPlane = ({ assets, mode, onMode }: InfinityPlaneProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [cam, setCam] = useState({ x: 40, y: 40, zoom: 1 })
  const drag = useRef<{ x: number; y: number } | null>(null)
  const moved = useRef(false)

  const byId = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])
  const layout = useMemo(() => justify(assets), [assets])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setSize({ w: entry.contentRect.width, h: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const visible = useMemo(() => {
    if (size.w === 0) return []
    const left = -cam.x / cam.zoom - 240
    const top = -cam.y / cam.zoom - 240
    const right = (size.w - cam.x) / cam.zoom + 240
    const bottom = (size.h - cam.y) / cam.zoom + 240
    const out: { asset: GridAsset; x: number; y: number; w: number; h: number }[] = []
    for (const [id, r] of layout.rects) {
      if (r.x + r.w < left || r.x > right || r.y + r.h < top || r.y > bottom) continue
      const asset = byId.get(id)
      if (asset) out.push({ asset, x: r.x, y: r.y, w: r.w, h: r.h })
    }
    return out
  }, [layout, cam, size, byId])

  const zoomAt = (factor: number, cx: number, cy: number) =>
    setCam((c) => {
      const zoom = clamp(c.zoom * factor, MIN_ZOOM, MAX_ZOOM)
      const k = zoom / c.zoom
      return { zoom, x: cx - (cx - c.x) * k, y: cy - (cy - c.y) * k }
    })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      if (event.ctrlKey) zoomAt(Math.exp(-event.deltaY * 0.01), event.clientX - rect.left, event.clientY - rect.top)
      else setCam((c) => ({ ...c, x: c.x - event.deltaX, y: c.y - event.deltaY }))
    }
    const onGesture = (event: Event & { scale?: number }) => {
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const scale = event.scale ?? 1
      zoomAt(scale > 0 ? 1 + (scale - 1) * 0.5 : 1, rect.width / 2, rect.height / 2)
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    el.addEventListener("gesturechange", onGesture as EventListener)
    return () => {
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("gesturechange", onGesture as EventListener)
    }
  }, [])

  const onPointerDown = (event: ReactPointerEvent) => {
    drag.current = { x: event.clientX, y: event.clientY }
    moved.current = false
  }
  const onPointerMove = (event: ReactPointerEvent) => {
    if (!drag.current) return
    const dx = event.clientX - drag.current.x
    const dy = event.clientY - drag.current.y
    if (Math.hypot(dx, dy) > 4) moved.current = true
    drag.current = { x: event.clientX, y: event.clientY }
    setCam((c) => ({ ...c, x: c.x + dx, y: c.y + dy }))
  }
  const onPointerUp = () => {
    drag.current = null
  }

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-0 touch-none overflow-hidden"
      style={{ cursor: drag.current ? "grabbing" : "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `translate3d(${cam.x}px, ${cam.y}px, 0) scale(${cam.zoom})` }}
      >
        {visible.map((item) => (
          <Tile
            key={item.asset.id}
            asset={item.asset}
            x={item.x}
            y={item.y}
            w={item.w}
            h={item.h}
            onClick={() => {
              if (moved.current) return
              onMode("grid")
            }}
          />
        ))}
      </div>

      <div onPointerDown={(event) => event.stopPropagation()}>
        <BottomChrome
          focusedAsset={null}
          mode={mode}
          onMode={onMode}
          rowHeight={0}
          onRowHeight={() => {}}
          gap={0}
          onGap={() => {}}
          square={false}
          onSquare={() => {}}
          info={false}
          onToggleInfo={() => {}}
          onClose={() => {}}
        />
      </div>
    </div>
  )
}

export default InfinityPlane
