"use client"

import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react"
import { Icon } from "@lib/icons"
import type { GridAsset } from "@lib/photos"
import { fetchDecryptedPhotoOriginal, fetchDecryptedPhotoThumbnail } from "@lib/photosE2e"
import { useSelection } from "@lib/selection"
import { usePersistentNumber } from "@lib/persistentSetting"
import Lightbox from "@pages/Photos/components/Lightbox/Lightbox"
import PhotoTile from "@pages/Photos/components/PhotoTile/PhotoTile"
import TimelineScrubber, {
  type TimelineMarker,
} from "@pages/Photos/components/TimelineScrubber/TimelineScrubber"
import { IconCircle } from "@tabler/icons-react"
import { cn } from "@workspace/ui/lib/utils"
import { AnimatePresence, motion } from "motion/react"

const DEFAULT_GAP = 12
const HEADER_HEIGHT = 30
const HEADER_GAP = 6
const SECTION_GAP = 32
/** Visual margin around the grid, baked into the layout so the surrounding space is still
 * part of the (selectable) grid container rather than dead outer padding. */
const INSET = 24
const RESIZE_EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)"
const TILE_RESIZE_CSS = `top 0.3s ${RESIZE_EASE}, left 0.3s ${RESIZE_EASE}, width 0.3s ${RESIZE_EASE}, height 0.3s ${RESIZE_EASE}`
const HEADER_RESIZE_CSS = `top 0.3s ${RESIZE_EASE}`

const getScrollParent = (element: HTMLElement | null): HTMLElement | null => {
  let node = element?.parentElement ?? null
  while (node) {
    const overflowY = getComputedStyle(node).overflowY
    if (overflowY === "auto" || overflowY === "scroll") return node
    node = node.parentElement
  }
  return null
}
const BUFFER = 800
const RANGE_QUANTUM = 300
const VIRTUALIZE_THRESHOLD = 80

const dayLabel = (date: Date): string => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000)
  if (diff <= 0) return "Today"
  if (diff === 1) return "Yesterday"
  if (diff < 7) return date.toLocaleDateString(undefined, { weekday: "long" })
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}

const dateOf = (asset: GridAsset): Date => new Date(asset.takenAt ?? asset.createdAt)
const dayKey = (asset: GridAsset): string => dateOf(asset).toISOString().slice(0, 10)

const aspectOf = (asset: GridAsset): number => {
  const raw = asset.width && asset.height ? asset.width / asset.height : 1
  return Math.min(Math.max(raw, 0.4), 3)
}

export interface TileCorners {
  tl: boolean
  tr: boolean
  bl: boolean
  br: boolean
}

interface Cell {
  asset: GridAsset
  x: number
  width: number
  height: number
  corners?: TileCorners
}

type Row =
  | {
      type: "header"
      key: string
      day: string
      y: number
      height: number
      label: string
      date: Date
      assetIds: string[]
    }
  | { type: "images"; key: string; day: string; y: number; height: number; cells: Cell[] }

interface Layout {
  rows: Row[]
  totalHeight: number
}

const buildLayout = (
  assets: GridAsset[],
  width: number,
  rowHeight: number,
  gap: number,
  square: boolean,
): Layout => {
  if (width <= 0 || assets.length === 0) return { rows: [], totalHeight: 0 }
  const innerWidth = Math.max(width - INSET * 2, 1)
  const rows: Row[] = []
  let y = INSET
  let i = 0

  while (i < assets.length) {
    const key = dayKey(assets[i]!)
    const group: GridAsset[] = []
    while (i < assets.length && dayKey(assets[i]!) === key) {
      group.push(assets[i]!)
      i += 1
    }

    rows.push({
      type: "header",
      key: `h-${key}`,
      day: key,
      y,
      height: HEADER_HEIGHT,
      label: dayLabel(dateOf(group[0]!)),
      date: dateOf(group[0]!),
      assetIds: group.map((asset) => asset.id),
    })
    y += HEADER_HEIGHT + HEADER_GAP

    if (square) {
      const cols = Math.max(1, Math.round((innerWidth + gap) / (rowHeight + gap)))
      const tile = (innerWidth - (cols - 1) * gap) / cols
      const totalRows = Math.ceil(group.length / cols)
      for (let start = 0, rowIndex = 0; start < group.length; start += cols, rowIndex += 1) {
        const slice = group.slice(start, start + cols)
        const lastRow = rowIndex === totalRows - 1
        const cells = slice.map((asset, column) => ({
          asset,
          x: INSET + column * (tile + gap),
          width: tile,
          height: tile,
          corners: {
            tl: rowIndex === 0 && column === 0,
            tr: rowIndex === 0 && column === slice.length - 1,
            bl: lastRow && column === 0,
            br: lastRow && column === cols - 1,
          },
        }))
        rows.push({ type: "images", key: `r-${slice[0]!.id}`, day: key, y, height: tile, cells })
        y += tile + gap
      }
      y += SECTION_GAP
      continue
    }

    let current: { asset: GridAsset; aspect: number }[] = []
    let aspectSum = 0

    const flush = (stretch: boolean) => {
      if (current.length === 0) return
      const gaps = (current.length - 1) * gap
      const height = stretch ? (innerWidth - gaps) / aspectSum : rowHeight
      let x = INSET
      const cells = current.map((item) => {
        const cellWidth = height * item.aspect
        const cell: Cell = { asset: item.asset, x, width: cellWidth, height }
        x += cellWidth + gap
        return cell
      })
      rows.push({ type: "images", key: `r-${current[0]!.asset.id}`, day: key, y, height, cells })
      y += height + gap
      current = []
      aspectSum = 0
    }

    for (const asset of group) {
      const aspect = aspectOf(asset)
      current.push({ asset, aspect })
      aspectSum += aspect
      if (aspectSum * rowHeight + (current.length - 1) * gap >= innerWidth) flush(true)
    }
    flush(false)
    y += SECTION_GAP
  }

  const contentBottom = rows.reduce((max, row) => Math.max(max, row.y + row.height), 0)
  return { rows, totalHeight: contentBottom + INSET }
}

interface PhotoGridProps {
  assets: GridAsset[]
  onReachEnd?: () => void
}

const PhotoGrid = ({ assets, onReachEnd }: PhotoGridProps) => {
  const selection = useSelection()
  const containerRef = useRef<HTMLDivElement>(null)
  const reachEndRef = useRef(onReachEnd)
  reachEndRef.current = onReachEnd
  const seenRef = useRef<Set<string>>(new Set())
  const [width, setWidth] = useState(0)
  const [range, setRange] = useState({ start: 0, end: 0 })
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [preview, setPreview] = useState<GridAsset | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)
  const [marquee, setMarquee] = useState<{
    x0: number
    y0: number
    x1: number
    y1: number
  } | null>(null)
  const marqueePointer = useRef<number | null>(null)
  const marqueeStart = useRef<{ x: number; y: number } | null>(null)
  const marqueeBase = useRef<Set<string>>(new Set())
  const draggedRef = useRef(false)
  const scrubberRef = useRef<HTMLDivElement>(null)
  const [rowHeight] = usePersistentNumber("photos.rowHeight", 180)
  const [gap] = usePersistentNumber("photos.gap", DEFAULT_GAP)
  const [rounded] = usePersistentNumber("photos.rounded", 1)
  const [square] = usePersistentNumber("photos.square", 0)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const sortedGridAssets = useMemo(
    () => [...assets].sort((a, b) => dateOf(b).getTime() - dateOf(a).getTime()),
    [assets],
  )
  const layout = useMemo(
    () => buildLayout(sortedGridAssets, width, rowHeight, gap, square === 1),
    [sortedGridAssets, width, rowHeight, gap, square],
  )

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const element = containerRef.current
      if (!element) return
      const top = element.getBoundingClientRect().top
      const start = Math.floor((-top - BUFFER) / RANGE_QUANTUM) * RANGE_QUANTUM
      const end = Math.ceil((-top + window.innerHeight + BUFFER) / RANGE_QUANTUM) * RANGE_QUANTUM
      setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
      const scrollerRect = getScrollParent(element)?.getBoundingClientRect()
      if (scrubberRef.current) {
        const height = Math.min(scrollerRect?.height ?? window.innerHeight, layout.totalHeight)
        const desiredTop = (scrollerRect?.top ?? 0) - top
        const maxTop = Math.max(0, layout.totalHeight - height)
        scrubberRef.current.style.top = `${Math.min(Math.max(desiredTop, 0), maxTop)}px`
        scrubberRef.current.style.height = `${height}px`
      }
      if (layout.totalHeight > 0 && end >= layout.totalHeight - 400) reachEndRef.current?.()
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
  }, [layout.totalHeight])

  const ordered = useMemo(() => sortedGridAssets.map((asset) => asset.id), [sortedGridAssets])

  const onToggle = (id: string, shiftKey: boolean) => {
    if (draggedRef.current) return
    if (shiftKey) selection.rangeTo(id, ordered)
    else selection.toggle(id, ordered)
  }
  const onOpen = (id: string) => {
    if (draggedRef.current) return
    const position = sortedGridAssets.findIndex((asset) => asset.id === id)
    if (position >= 0) setOpenIndex(position)
  }

  const pointFromEvent = (event: ReactPointerEvent): { x: number; y: number } => {
    const rect = containerRef.current?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }

  const onMarqueeDown = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return
    marqueePointer.current = event.pointerId
    marqueeStart.current = pointFromEvent(event)
    marqueeBase.current = event.shiftKey ? new Set(selection.selected) : new Set()
    draggedRef.current = false
    // Empty-space start (not on a tile): capture now so a drag in any direction —
    // including off the grid into the margins — keeps feeding the marquee.
    if (event.target === event.currentTarget) {
      containerRef.current?.setPointerCapture(event.pointerId)
    }
  }

  const onMarqueeMove = (event: ReactPointerEvent) => {
    if (marqueePointer.current !== event.pointerId || !marqueeStart.current) return
    const start = marqueeStart.current
    const point = pointFromEvent(event)
    if (!draggedRef.current) {
      if (Math.abs(point.x - start.x) < 14 && Math.abs(point.y - start.y) < 14) return
      draggedRef.current = true
      containerRef.current?.setPointerCapture(event.pointerId)
    }
    const rect = {
      x0: Math.min(start.x, point.x),
      y0: Math.min(start.y, point.y),
      x1: Math.max(start.x, point.x),
      y1: Math.max(start.y, point.y),
    }
    setMarquee(rect)
    const hits = new Set(marqueeBase.current)
    for (const row of layout.rows) {
      if (row.type !== "images") continue
      for (const cell of row.cells) {
        const overlap = !(
          cell.x > rect.x1 ||
          cell.x + cell.width < rect.x0 ||
          row.y > rect.y1 ||
          row.y + cell.height < rect.y0
        )
        if (overlap) hits.add(cell.asset.id)
      }
    }
    selection.selectAll([...hits])
  }

  const onMarqueeUp = (event: ReactPointerEvent) => {
    if (marqueePointer.current !== event.pointerId) return
    if (containerRef.current?.hasPointerCapture(event.pointerId)) {
      containerRef.current.releasePointerCapture(event.pointerId)
    }
    if (draggedRef.current) {
      setMarquee(null)
      window.setTimeout(() => {
        draggedRef.current = false
      }, 0)
    }
    marqueePointer.current = null
    marqueeStart.current = null
  }

  useEffect(() => {
    if (openIndex === null) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenIndex(null)
      else if (event.key === "ArrowLeft") setOpenIndex((i) => (i !== null && i > 0 ? i - 1 : i))
      else if (event.key === "ArrowRight")
        setOpenIndex((i) => (i !== null && i < sortedGridAssets.length - 1 ? i + 1 : i))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [openIndex, sortedGridAssets.length])

  const visibleRows = useMemo(
    () =>
      layout.rows.length <= VIRTUALIZE_THRESHOLD
        ? layout.rows
        : layout.rows.filter((row) => row.y + row.height >= range.start && row.y <= range.end),
    [layout.rows, range.start, range.end],
  )
  const selectionActive = selection.count > 0

  const markers = useMemo<TimelineMarker[]>(() => {
    const out: TimelineMarker[] = []
    for (const row of layout.rows) {
      if (row.type !== "header") continue
      out.push({
        y: row.y,
        label: row.date.toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      })
    }
    return out
  }, [layout])

  const scrollToY = (y: number) => {
    const element = containerRef.current
    if (!element) return
    const scroller = getScrollParent(element)
    const gridTop = element.getBoundingClientRect().top
    const delta = gridTop + y - (scroller?.getBoundingClientRect().top ?? 0)
    ;(scroller ?? window).scrollBy({ top: delta, behavior: "smooth" })
  }

  useEffect(() => {
    if (!preview) {
      setPreviewSrc(null)
      return
    }
    if (!preview.encrypted) {
      setPreviewSrc(preview.previewUrl ?? preview.thumbnailUrl ?? null)
      return
    }
    let active = true
    let url: string | null = null
    const resolve =
      preview.type === "image"
        ? fetchDecryptedPhotoOriginal(preview.id, preview.mimeType)
        : fetchDecryptedPhotoThumbnail(preview.id)
    void resolve.then((result) => {
      if (!active) {
        if (result) URL.revokeObjectURL(result)
        return
      }
      url = result
      setPreviewSrc(result)
    })
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [preview])

  const seen = seenRef.current
  useEffect(() => {
    for (const row of visibleRows) {
      if (row.type === "images") for (const cell of row.cells) seen.add(cell.asset.id)
    }
  })

  let newCount = 0

  return (
    <div
      ref={containerRef}
      className="relative min-h-full w-full"
      style={{ height: layout.totalHeight }}
      onPointerDown={onMarqueeDown}
      onPointerMove={onMarqueeMove}
      onPointerUp={onMarqueeUp}
      onPointerCancel={onMarqueeUp}
      onPointerLeave={() => setHoveredDay(null)}
    >
      {marquee ? (
        <div
          className="border-primary bg-primary/15 pointer-events-none absolute z-30 rounded-sm border"
          style={{
            left: marquee.x0,
            top: marquee.y0,
            width: marquee.x1 - marquee.x0,
            height: marquee.y1 - marquee.y0,
          }}
        />
      ) : null}

      <TimelineScrubber
        rootRef={scrubberRef}
        markers={markers}
        totalHeight={layout.totalHeight}
        onScrubTo={scrollToY}
      />
      {visibleRows.map((row) =>
        row.type === "header" ? (
          <div
            key={row.key}
            className="group absolute flex items-center"
            style={{ top: row.y, left: INSET, transition: HEADER_RESIZE_CSS }}
          >
            <button
              type="button"
              onClick={() => selection.toggleMany(row.assetIds)}
              className="flex items-center py-0.5 text-sm font-medium"
            >
              <span
                className={cn(
                  "flex shrink-0 items-center overflow-hidden transition-[width,opacity] duration-150",
                  row.assetIds.every((id) => selection.isSelected(id)) || hoveredDay === row.day
                    ? "w-7 opacity-100"
                    : "w-0 opacity-0 group-hover:w-7 group-hover:opacity-100",
                )}
              >
                {row.assetIds.every((id) => selection.isSelected(id)) ? (
                  <Icon name="circle-check" className="size-5 shrink-0 text-white drop-shadow" />
                ) : (
                  <IconCircle className="text-muted-foreground/60 size-5 shrink-0" />
                )}
              </span>
              <span>{row.label}</span>
            </button>
          </div>
        ) : (
          row.cells.map((cell) => {
            const fresh = !seen.has(cell.asset.id)
            const delay = fresh ? Math.min(newCount++ * 0.03, 0.35) : 0
            return (
              <div
                key={cell.asset.id}
                className="absolute"
                onPointerEnter={() => setHoveredDay(row.day)}
                style={{
                  top: row.y,
                  left: cell.x,
                  width: cell.width,
                  height: cell.height,
                  transition: TILE_RESIZE_CSS,
                }}
              >
                <PhotoTile
                  asset={cell.asset}
                  rounded={rounded === 1}
                  corners={square === 1 && rounded === 1 ? cell.corners : undefined}
                  selected={selection.isSelected(cell.asset.id)}
                  selectionActive={selectionActive}
                  animateIn={fresh}
                  delay={delay}
                  onOpen={() => onOpen(cell.asset.id)}
                  onToggle={(shiftKey) => onToggle(cell.asset.id, shiftKey)}
                  onPreviewStart={() => setPreview(cell.asset)}
                  onPreviewEnd={() => setPreview(null)}
                />
              </div>
            )
          })
        ),
      )}

      <AnimatePresence>
        {openIndex !== null ? (
          <Lightbox
            key="lightbox"
            assets={sortedGridAssets}
            index={openIndex}
            onIndexChange={setOpenIndex}
            onClose={() => setOpenIndex(null)}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {preview ? (
          <motion.div
            key="quick-preview"
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-10 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.img
              src={previewSrc ?? undefined}
              alt={preview.originalFilename}
              className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default PhotoGrid
