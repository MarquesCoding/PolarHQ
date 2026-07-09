import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react"
import { useSelection } from "@workspace/screens/selection"
import { usePersistentNumber } from "@workspace/screens/persistentSetting"
import { AnimatePresence } from "motion/react"
import Filmstrip from "./Filmstrip"
import { useSidebar } from "@workspace/ui/components/sidebar"
import { Button } from "@workspace/ui/components/button"
import { Circle } from "@phosphor-icons/react"
import { Icon } from "@workspace/screens/icons"
import { cn } from "@workspace/ui/lib/utils"
import AssetEntity from "./AssetEntity"
import BottomChrome from "./BottomChrome"
import FocusView from "./FocusView"
import { layoutCanvas } from "./layout/canvas"
import { layoutGrid } from "./layout/grid"
import { decryptName } from "@workspace/core/e2e"
import { favoriteAssets } from "@workspace/core/photos"
import type { GridAsset, Mode, Rect, SortKey } from "./types"

interface Focus {
  id: string
  rect: Rect
  vp: { top: number; height: number; width: number }
}

const BUFFER = 900
const QUANTUM = 300
const CANVAS_KEY = "photos.canvasPositions"

const dateOf = (asset: GridAsset): number => new Date(asset.takenAt ?? asset.createdAt).getTime()
const nameOf = (asset: GridAsset): string => {
  let name = asset.originalFilename || ""
  if (asset.encrypted && asset.encryptedName) {
    try {
      name = decryptName(asset.encryptedName) || name
    } catch {
      /* keep the fallback name */
    }
  }
  return name.toLowerCase()
}

const SORT_KEYS: SortKey[] = ["date-desc", "date-asc", "name-asc", "name-desc"]
const comparators: Record<SortKey, (a: GridAsset, b: GridAsset) => number> = {
  "date-desc": (a, b) => dateOf(b) - dateOf(a),
  "date-asc": (a, b) => dateOf(a) - dateOf(b),
  "name-asc": (a, b) => nameOf(a).localeCompare(nameOf(b)),
  "name-desc": (a, b) => nameOf(b).localeCompare(nameOf(a)),
}

const loadCanvasPositions = (): Map<string, Rect> => {
  try {
    const raw = localStorage.getItem(CANVAS_KEY)
    return raw ? new Map(Object.entries(JSON.parse(raw) as Record<string, Rect>)) : new Map()
  } catch {
    return new Map()
  }
}

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
  onInvalidate?: () => void
  onFavourite?: (ids: string[], next: boolean) => void
  /** Sub-collections (albums, favourites, trash…) render grid-only — no Grid/Canvas/Infinity switcher. */
  showModes?: boolean
}

const PhotoWorkspace = ({
  assets,
  onReachEnd,
  onInvalidate,
  onFavourite,
  showModes = true,
}: PhotoWorkspaceProps) => {
  const selection = useSelection()
  const { open: sidebarOpen, setOpen } = useSidebar()
  const containerRef = useRef<HTMLDivElement>(null)
  const sidebarWasOpen = useRef(true)
  const collapsedByZoom = useRef(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const zoomRef = useRef(1)
  const setZoomClamped = (value: number) => {
    const next = Math.min(Math.max(value, 1), 6)
    zoomRef.current = next
    setZoom(next)
    if (next === 1) setPan({ x: 0, y: 0 })
  }
  const onPan = (dx: number, dy: number) =>
    setPan((current) => ({ x: current.x + dx, y: current.y + dy }))
  const reachEnd = useRef(onReachEnd)
  reachEnd.current = onReachEnd

  const [width, setWidth] = useState(0)
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const sidebarInset = sidebarOpen ? sidebarWidth : 0
  const [range, setRange] = useState({ start: 0, end: 0 })
  const [rowHeight, setRowHeight] = usePersistentNumber("photos.rowHeight", 180)
  const [gap, setGap] = usePersistentNumber("photos.gap", 12)
  const [square, setSquare] = usePersistentNumber("photos.square", 0)
  const [modeNum, setModeNum] = usePersistentNumber("photos.mode", 0)
  const mode: Mode = !showModes
    ? "grid"
    : modeNum === 1
      ? "canvas"
      : modeNum === 2
        ? "infinity"
        : "grid"
  const setMode = (next: Mode) => setModeNum(next === "canvas" ? 1 : next === "infinity" ? 2 : 0)
  const [sortNum, setSortNum] = usePersistentNumber("photos.sort", 0)
  const sort: SortKey = SORT_KEYS[sortNum] ?? "date-desc"
  const onSort = (next: SortKey) => setSortNum(Math.max(0, SORT_KEYS.indexOf(next)))
  const [hideDatesNum, setHideDatesNum] = usePersistentNumber("photos.hideDates", 0)
  const [stripNum, setStripNum] = usePersistentNumber("photos.filmstrip", 0)
  const strip = stripNum === 1
  const hideDates = hideDatesNum === 1
  const [canvasPositions, setCanvasPositions] = useState<Map<string, Rect>>(loadCanvasPositions)
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const sorted = useMemo(() => [...assets].sort(comparators[sort]), [assets, sort])
  const ordered = useMemo(() => sorted.map((asset) => asset.id), [sorted])
  const layout = useMemo(() => {
    if (mode === "canvas") return layoutCanvas(sorted, width, sidebarInset, canvasPositions)
    return layoutGrid(
      sorted,
      width,
      {
        rowHeight: mode === "infinity" ? 130 : rowHeight,
        gap: mode === "infinity" ? 10 : gap,
        square: square === 1 && mode !== "infinity",
        continuous: mode === "infinity" || hideDates,
      },
      sidebarInset,
    )
  }, [mode, sorted, width, rowHeight, gap, square, hideDates, sidebarInset, canvasPositions])
  useEffect(() => {
    localStorage.setItem(CANVAS_KEY, JSON.stringify(Object.fromEntries(canvasPositions)))
  }, [canvasPositions])
  const onCanvasDrag = (id: string, dx: number, dy: number) => {
    const current = layout.rects.get(id)
    if (!current) return
    setCanvasPositions((prev) => {
      const next = new Map(prev)
      next.set(id, { ...current, x: current.x + dx, y: current.y + dy })
      return next
    })
  }
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
    const el = document.querySelector('[data-slot="sidebar-inner"]')
    if (!el) return
    const update = () => {
      const right = el.getBoundingClientRect().right
      if (right > 40) setSidebarWidth(right)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
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
    // Clamp inside the container so dragging past the edge doesn't push the marquee out and scroll the page.
    const x = event.clientX - (rect?.left ?? 0)
    const y = event.clientY - (rect?.top ?? 0)
    return {
      x: Math.max(0, Math.min(x, rect?.width ?? x)),
      y: Math.max(0, Math.min(y, rect?.height ?? y)),
    }
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

  const [focus, setFocus] = useState<Focus | null>(null)
  const [fading, setFading] = useState<{ id: string; rect: Rect } | null>(null)
  const [settling, setSettling] = useState<string | null>(null)
  const [revealing, setRevealing] = useState<string | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)
  const [info, setInfo] = useState(false)

  // Each non-focused photo is its own entity: push it AWAY from the opened photo, strongest for the
  // nearest neighbours and fading off with distance — so they part to make room, rather than the whole
  // grid scaling uniformly.
  const PUSH_MAX = 300
  const PUSH_FALLOFF = 360
  const repel = (rect: Rect, cx: number, cy: number): Rect => {
    const dx = rect.x + rect.w / 2 - cx
    const dy = rect.y + rect.h / 2 - cy
    const dist = Math.hypot(dx, dy) || 1
    const strength = PUSH_MAX * Math.exp(-dist / PUSH_FALLOFF)
    return { x: rect.x + (dx / dist) * strength, y: rect.y + (dy / dist) * strength, w: rect.w, h: rect.h }
  }
  const focusCenter = focus ? { x: focus.rect.x + focus.rect.w / 2, y: focus.rect.y + focus.rect.h / 2 } : null

  const DETAILS_WIDTH = sidebarWidth
  const focusRectFor = (asset: GridAsset, vp: Focus["vp"], rightInset = 0, leftInset = 0): Rect => {
    const padX = 40
    const padY = 40
    const chrome = 104
    const availW = vp.width - leftInset - rightInset - padX * 2
    const availH = vp.height - padY * 2 - chrome
    const aspect = asset.width && asset.height ? asset.width / asset.height : 1.5
    let w = availW
    let h = w / aspect
    if (h > availH) {
      h = availH
      w = h * aspect
    }
    const cx = leftInset + (vp.width - leftInset - rightInset) / 2
    const cy = vp.top + vp.height / 2
    return { x: cx - w / 2, y: cy - h / 2, w, h }
  }

  const openAsset = (id: string) => {
    const asset = sorted.find((item) => item.id === id)
    const element = containerRef.current
    if (!asset || !element) return
    sidebarWasOpen.current = sidebarOpen
    collapsedByZoom.current = false
    setZoomClamped(1)
    const vp: Focus["vp"] = {
      top: -element.getBoundingClientRect().top,
      height: getScrollParent(element)?.clientHeight ?? window.innerHeight,
      width,
    }
    setFocus({ id, rect: focusRectFor(asset, vp, info ? DETAILS_WIDTH : 0, sidebarInset), vp })
  }

  const page = (delta: number) => {
    if (!focus) return
    const id = ordered[ordered.indexOf(focus.id) + delta]
    if (id) goTo(id)
  }

  const goTo = (id: string) => {
    if (!focus || id === focus.id) return
    const asset = sorted.find((item) => item.id === id)
    if (!asset) return
    const prevId = focus.id
    setFading({ id: prevId, rect: focus.rect })
    setRevealing(id)
    window.setTimeout(() => setRevealing((current) => (current === id ? null : current)), 320)
    window.setTimeout(() => {
      setFading((current) => (current?.id === prevId ? null : current))
      setSettling(prevId)
      window.setTimeout(() => setSettling((current) => (current === prevId ? null : current)), 60)
    }, 340)
    setZoomClamped(1)
    setFocus({
      id,
      rect: focusRectFor(asset, focus.vp, info ? DETAILS_WIDTH : 0, sidebarInset),
      vp: focus.vp,
    })
  }

  const close = () => {
    if (!focus) return
    const id = focus.id
    setClosingId(id)
    window.setTimeout(() => setClosingId((current) => (current === id ? null : current)), 480)
    setFading(null)
    setFocus(null)
    setZoomClamped(1)
    setInfo(false)
    collapsedByZoom.current = false
    setOpen(sidebarWasOpen.current)
  }

  useEffect(() => {
    if (!focus) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close()
      else if (event.key === "ArrowRight") page(1)
      else if (event.key === "ArrowLeft") page(-1)
      else if (event.key === "f" || event.key === "F") {
        const asset = sorted.find((item) => item.id === focus.id)
        if (!asset) return
        if (onFavourite) onFavourite([asset.id], !asset.isFavorite)
        else void favoriteAssets([asset.id], !asset.isFavorite).then(() => onInvalidate?.())
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, ordered])

  const focusedAsset = focus ? sorted.find((item) => item.id === focus.id) : undefined

  const renderList = useMemo(() => {
    const pinned = [focus?.id, fading?.id, settling, closingId].filter((id): id is string =>
      Boolean(id),
    )
    if (pinned.length === 0) return visible
    const present = new Set(visible.map((entry) => entry.asset.id))
    const extra = pinned
      .filter((id) => !present.has(id))
      .map((id) => entries.find((entry) => entry.asset.id === id))
      .filter((entry): entry is (typeof entries)[number] => Boolean(entry))
    return extra.length ? [...visible, ...extra] : visible
  }, [visible, entries, focus, fading, settling, closingId])

  useEffect(() => {
    const scroller = getScrollParent(containerRef.current)
    if (!scroller || !focus) return
    const previous = scroller.style.overflow
    scroller.style.overflow = "hidden"
    return () => {
      scroller.style.overflow = previous
    }
  }, [focus])

  const rowHeightRef = useRef(rowHeight)
  rowHeightRef.current = rowHeight
  const focusRef = useRef(focus)
  focusRef.current = focus
  const modeRef = useRef(mode)
  modeRef.current = mode
  const [pinching, setPinching] = useState(false)
  const pinchTimer = useRef<number | undefined>(undefined)
  useEffect(() => {
    const clampSize = (v: number) => Math.round(Math.min(Math.max(v, 110), 340))
    const markPinching = () => {
      setPinching(true)
      window.clearTimeout(pinchTimer.current)
      pinchTimer.current = window.setTimeout(() => setPinching(false), 900)
    }
    // Note: we deliberately no longer collapse the sidebar on zoom — doing so changed sidebarInset
    // mid-gesture, which re-centered the base rect and left the image misplaced on zoom-out.
    const syncSidebar = (_next: number) => {}
    let base = 1
    const onStart = () => {
      base = focusRef.current ? zoomRef.current : rowHeightRef.current
    }
    const onChange = (event: Event) => {
      const scale = (event as unknown as { scale?: number }).scale
      if (scale === undefined) return
      if (focusRef.current) {
        const next = base * scale
        setZoomClamped(next)
        syncSidebar(next)
      } else if (modeRef.current === "grid") {
        markPinching()
        setRowHeight(clampSize(base * scale))
      }
    }
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      if (focusRef.current) {
        const next = zoomRef.current * (1 - event.deltaY * 0.01)
        setZoomClamped(next)
        syncSidebar(next)
      } else if (modeRef.current === "grid") {
        markPinching()
        setRowHeight(clampSize(rowHeightRef.current * (1 - event.deltaY * 0.01)))
      }
    }
    window.addEventListener("gesturestart", onStart)
    window.addEventListener("gesturechange", onChange)
    window.addEventListener("wheel", onWheel, { passive: true })
    return () => {
      window.removeEventListener("gesturestart", onStart)
      window.removeEventListener("gesturechange", onChange)
      window.removeEventListener("wheel", onWheel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!focus) return
    const asset = sorted.find((item) => item.id === focus.id)
    if (!asset) return
    const vp = { ...focus.vp, width }
    const rect = focusRectFor(asset, vp, info ? DETAILS_WIDTH : 0, sidebarInset)
    setFocus((current) => (current ? { ...current, rect, vp } : current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, sidebarInset, info])

  return (
    <div
      ref={containerRef}
      className="relative min-h-full w-full overflow-x-clip select-none"
      style={{ height: layout.height }}
      onPointerDown={onMarqueeDown}
      onPointerMove={onMarqueeMove}
      onPointerUp={onMarqueeUp}
      onPointerCancel={onMarqueeUp}
    >
      {focus || closingId
        ? null
        : layout.markers
            .filter((marker) => marker.y >= range.start - 80 && marker.y <= range.end + 80)
            .map((marker) => {
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

      {renderList.map(({ asset, rect: gridRect }) => {
        const isFocused = focus?.id === asset.id
        const isFading = fading?.id === asset.id
        const isSettling = settling === asset.id
        const isClosing = !focus && closingId === asset.id
        let rect = gridRect
        if (isFocused && focus) rect = focus.rect
        else if (isFading && fading) rect = fading.rect
        else if (focus && focusCenter) rect = repel(gridRect, focusCenter.x, focusCenter.y)
        return (
          <AssetEntity
            key={asset.id}
            asset={asset}
            rect={rect}
            selected={selection.isSelected(asset.id)}
            selectionActive={selection.count > 0}
            dimmed={focus !== null && !isFocused && !isFading}
            focused={isFocused || isFading}
            fadingOut={isFading}
            revealing={revealing === asset.id}
            zoom={isFocused ? zoom : 1}
            panX={isFocused ? pan.x : 0}
            panY={isFocused ? pan.y : 0}
            animate={
              isFading || isSettling || revealing === asset.id
                ? false
                : isFocused
                  ? fading === null
                  : true
            }
            z={isFocused ? 50 : isFading ? 51 : isClosing ? 50 : 1}
            draggable={mode === "canvas" && !focus}
            onOpen={() => openAsset(asset.id)}
            onToggle={(shiftKey) => onToggle(asset.id, shiftKey)}
            onPan={onPan}
            onDragCommit={(dx, dy) => onCanvasDrag(asset.id, dx, dy)}
          />
        )
      })}

      {focus && focusedAsset ? (
        <FocusView
          asset={focusedAsset}
          vp={focus.vp}
          zoom={zoom}
          info={info}
          panelWidth={sidebarWidth}
          leftInset={sidebarInset}
          hasPrev={ordered.indexOf(focus.id) > 0}
          hasNext={ordered.indexOf(focus.id) < ordered.length - 1}
          onClose={close}
          onPrev={() => page(-1)}
          onNext={() => page(1)}
          onToggleInfo={() => setInfo((value) => !value)}
          onInvalidate={onInvalidate}
          onFavourite={onFavourite}
        />
      ) : null}

      <AnimatePresence>
        {focus && focusedAsset && strip ? (
          <Filmstrip
            assets={sorted}
            currentId={focus.id}
            onJump={goTo}
            leftInset={sidebarInset}
            rightInset={info ? DETAILS_WIDTH : 0}
          />
        ) : null}
      </AnimatePresence>

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

      <BottomChrome
        focusedAsset={focusedAsset ?? null}
        showModes={showModes}
        pinching={pinching}
        leftInset={sidebarInset}
        detailsWidth={DETAILS_WIDTH}
        mode={mode}
        onMode={setMode}
        rowHeight={rowHeight}
        onRowHeight={setRowHeight}
        gap={gap}
        onGap={setGap}
        square={square === 1}
        onSquare={(value) => setSquare(value ? 1 : 0)}
        hideDates={hideDates}
        onHideDates={(value) => setHideDatesNum(value ? 1 : 0)}
        sort={sort}
        onSort={onSort}
        info={info}
        onToggleInfo={() => setInfo((value) => !value)}
        strip={strip}
        onToggleStrip={() => setStripNum(strip ? 0 : 1)}
        onClose={close}
        onInvalidate={onInvalidate}
        onFavourite={onFavourite}
      />
    </div>
  )
}

export default PhotoWorkspace
