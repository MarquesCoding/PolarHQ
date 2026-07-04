import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react"
import { useSelection } from "@workspace/screens/selection"
import { usePersistentNumber } from "@workspace/screens/persistentSetting"
import { Button } from "@workspace/ui/components/button"
import { Circle } from "@phosphor-icons/react"
import { Icon } from "@workspace/screens/icons"
import { cn } from "@workspace/ui/lib/utils"
import AssetEntity from "./AssetEntity"
import { layoutGrid } from "./layout/grid"
import type { GridAsset } from "./types"

const BUFFER = 900
const QUANTUM = 300

const dateOf = (asset: GridAsset): number => new Date(asset.takenAt ?? asset.createdAt).getTime()

const getScrollParent = (element: HTMLElement | null): HTMLElement | null => {
  let node = element?.parentElement ?? null
  while (node) {
    const overflow = getComputedStyle(node).overflowY
    if (overflow === "auto" || overflow === "scroll") return node
    node = node.parentElement
  }
  return null
}

interface PhotoWorkspaceProps {
  assets: GridAsset[]
  onReachEnd?: () => void
}

const PhotoWorkspace = ({ assets, onReachEnd }: PhotoWorkspaceProps) => {
  const selection = useSelection()
  const containerRef = useRef<HTMLDivElement>(null)
  const reachEnd = useRef(onReachEnd)
  reachEnd.current = onReachEnd

  const [width, setWidth] = useState(0)
  const [range, setRange] = useState({ start: 0, end: 0 })
  const [rowHeight] = usePersistentNumber("photos.rowHeight", 180)
  const [gap] = usePersistentNumber("photos.gap", 12)
  const [square] = usePersistentNumber("photos.square", 0)
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const sorted = useMemo(() => [...assets].sort((a, b) => dateOf(b) - dateOf(a)), [assets])
  const ordered = useMemo(() => sorted.map((asset) => asset.id), [sorted])
  const layout = useMemo(
    () => layoutGrid(sorted, width, { rowHeight, gap, square: square === 1 }),
    [sorted, width, rowHeight, gap, square],
  )
  const entries = useMemo(
    () =>
      sorted
        .map((asset) => ({ asset, rect: layout.rects.get(asset.id) }))
        .filter((entry): entry is { asset: GridAsset; rect: NonNullable<typeof entry.rect> } =>
          Boolean(entry.rect),
        ),
    [sorted, layout],
  )

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver((items) => {
      const entry = items[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const element = containerRef.current
      if (!element) return
      const top = element.getBoundingClientRect().top
      const start = Math.floor((-top - BUFFER) / QUANTUM) * QUANTUM
      const end = Math.ceil((-top + window.innerHeight + BUFFER) / QUANTUM) * QUANTUM
      setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
      if (layout.height > 0 && end >= layout.height - 400) reachEnd.current?.()
    }
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update)
    }
    const scroller = getScrollParent(containerRef.current)
    update()
    window.addEventListener("scroll", onScroll, { passive: true, capture: true })
    window.addEventListener("resize", onScroll)
    scroller?.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll, { capture: true })
      window.removeEventListener("resize", onScroll)
      scroller?.removeEventListener("scroll", onScroll)
    }
  }, [layout.height])

  const visible = useMemo(
    () => entries.filter(({ rect }) => rect.y + rect.h >= range.start && rect.y <= range.end),
    [entries, range],
  )

  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(
    null,
  )
  const marqueePointer = useRef<number | null>(null)
  const marqueeStart = useRef<{ x: number; y: number } | null>(null)
  const marqueeBase = useRef<Set<string>>(new Set())

  const pointFrom = (event: ReactPointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }
  const onMarqueeDown = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return
    if (event.target !== event.currentTarget) return
    marqueePointer.current = event.pointerId
    marqueeStart.current = pointFrom(event)
    marqueeBase.current = event.shiftKey ? new Set(selection.selected) : new Set()
    containerRef.current?.setPointerCapture(event.pointerId)
  }
  const onMarqueeMove = (event: ReactPointerEvent) => {
    if (marqueePointer.current !== event.pointerId || !marqueeStart.current) return
    const point = pointFrom(event)
    const box = {
      x0: Math.min(marqueeStart.current.x, point.x),
      y0: Math.min(marqueeStart.current.y, point.y),
      x1: Math.max(marqueeStart.current.x, point.x),
      y1: Math.max(marqueeStart.current.y, point.y),
    }
    setMarquee(box)
    const hits = new Set(marqueeBase.current)
    for (const { asset, rect } of entries) {
      if (rect.x < box.x1 && rect.x + rect.w > box.x0 && rect.y < box.y1 && rect.y + rect.h > box.y0)
        hits.add(asset.id)
    }
    selection.selectAll([...hits])
  }
  const onMarqueeUp = (event: ReactPointerEvent) => {
    if (marqueePointer.current !== event.pointerId) return
    marqueePointer.current = null
    marqueeStart.current = null
    setMarquee(null)
  }

  const onToggle = (id: string, shiftKey: boolean) => {
    if (shiftKey) selection.rangeTo(id, ordered)
    else selection.toggle(id, ordered)
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-full w-full select-none"
      style={{ height: layout.height }}
      onPointerDown={onMarqueeDown}
      onPointerMove={onMarqueeMove}
      onPointerUp={onMarqueeUp}
      onPointerCancel={onMarqueeUp}
    >
      {layout.markers.map((marker) => {
        const allSelected = marker.assetIds.every((id) => selection.isSelected(id))
        return (
          <div key={marker.key} className="absolute z-10" style={{ top: marker.y, left: marker.x }}>
            <Button
              variant="ghost"
              onClick={() => selection.selectAll([...selection.selected, ...marker.assetIds])}
              onPointerEnter={() => setHoveredDay(marker.key)}
              onPointerLeave={() => setHoveredDay(null)}
              className="flex h-auto items-center gap-1 rounded-md p-0 py-0.5 hover:bg-transparent"
            >
              <span
                className={cn(
                  "flex shrink-0 items-center overflow-hidden transition-[width,opacity] duration-150",
                  allSelected || hoveredDay === marker.key ? "w-5 opacity-100" : "w-0 opacity-0",
                )}
              >
                {allSelected ? (
                  <Icon name="circle-check" className="size-4 shrink-0 text-white drop-shadow" />
                ) : (
                  <Circle className="text-muted-foreground/60 size-4 shrink-0" />
                )}
              </span>
              <span className="text-foreground/70 text-xs font-semibold tracking-wide uppercase">
                {marker.label}
              </span>
            </Button>
          </div>
        )
      })}

      {visible.map(({ asset, rect }) => (
        <AssetEntity
          key={asset.id}
          asset={asset}
          rect={rect}
          selected={selection.isSelected(asset.id)}
          selectionActive={selection.count > 0}
          dimmed={false}
          focused={false}
          animate={false}
          z={1}
          onOpen={() => undefined}
          onToggle={(shiftKey) => onToggle(asset.id, shiftKey)}
        />
      ))}

      {marquee ? (
        <div
          className="border-primary/60 bg-primary/10 pointer-events-none absolute z-20 rounded-sm border"
          style={{
            left: marquee.x0,
            top: marquee.y0,
            width: marquee.x1 - marquee.x0,
            height: marquee.y1 - marquee.y0,
          }}
        />
      ) : null}
    </div>
  )
}

export default PhotoWorkspace
