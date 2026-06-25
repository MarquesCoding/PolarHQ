"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from "motion/react"
import { Icon } from "@workspace/ui/components/icon"
import SizeControl from "@workspace/ui/components/size-control"
import StorageMeter from "@workspace/ui/components/storage-meter"
import SuiteShell from "@workspace/ui/components/suite-shell"
import SuiteSidebar, { type SuiteNavItem } from "@workspace/ui/components/suite-sidebar"
import SuiteTitleBar from "@workspace/ui/components/suite-title-bar"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { cn } from "@workspace/ui/lib/utils"

const MIN = 120
const MAX = 330
const STEP = 30
const STEPS = (MAX - MIN) / STEP + 1
const toValue = (index: number): number => MIN + index * STEP
const indexOf = (progress: number): number => Math.round(progress * (STEPS - 1))

const RESIZE_EASE = "cubic-bezier(0.22, 0.61, 0.36, 1)"
const TILE_TRANSITION = `top 0.3s ${RESIZE_EASE}, left 0.3s ${RESIZE_EASE}, width 0.3s ${RESIZE_EASE}, height 0.3s ${RESIZE_EASE}`

const ASPECTS = [1.5, 0.72, 1, 1.78, 0.67, 1.33, 1, 0.8, 1.6, 1, 0.75, 1.4, 1.2, 0.66, 1.77]
const PHOTOS = ASPECTS.map((aspect, i) => ({ src: `/demo/${i + 1}.jpg`, aspect }))
const TILES = [...PHOTOS, ...PHOTOS, ...PHOTOS, ...PHOTOS].map((photo, i) => ({ ...photo, key: i }))

const NAV: SuiteNavItem[] = [
  { key: "photos", label: "All photos", icon: "images-3", href: "#", active: true },
  { key: "albums", label: "Albums", icon: "album-3", href: "#" },
  { key: "map", label: "Map", icon: "map-pin", href: "#" },
  { key: "favourites", label: "Favourites", icon: "favourites", href: "#" },
  { key: "trash", label: "Trash", icon: "trash", href: "#" },
]

const ALBUMS = [
  { key: "travel", label: "Travel", count: 128 },
  { key: "family", label: "Family", count: 64 },
]

type Tile = (typeof TILES)[number]
interface Cell extends Tile {
  x: number
  y: number
  w: number
  h: number
}

const buildLayout = (
  items: Tile[],
  width: number,
  rowHeight: number,
  gap: number,
  square: boolean,
): { cells: Cell[]; height: number } => {
  if (width <= 0) return { cells: [], height: 0 }
  const cells: Cell[] = []
  let y = 0

  if (square) {
    const cols = Math.max(1, Math.round((width + gap) / (rowHeight + gap)))
    const tile = (width - (cols - 1) * gap) / cols
    for (let start = 0; start < items.length; start += cols) {
      items.slice(start, start + cols).forEach((item, col) => {
        cells.push({ ...item, x: col * (tile + gap), y, w: tile, h: tile })
      })
      y += tile + gap
    }
    return { cells, height: Math.max(0, y - gap) }
  }

  let row: Tile[] = []
  let aspectSum = 0
  const flush = (stretch: boolean) => {
    if (row.length === 0) return
    const gaps = (row.length - 1) * gap
    const h = stretch ? (width - gaps) / aspectSum : rowHeight
    let x = 0
    for (const item of row) {
      const w = h * item.aspect
      cells.push({ ...item, x, y, w, h })
      x += w + gap
    }
    y += h + gap
    row = []
    aspectSum = 0
  }
  for (const item of items) {
    row.push(item)
    aspectSum += item.aspect
    if (aspectSum * rowHeight + (row.length - 1) * gap >= width) flush(true)
  }
  flush(false)
  return { cells, height: Math.max(0, y - gap) }
}

const PhotosDemo = () => {
  const progress = useMotionValue(0.5)
  const [size, setSize] = useState(toValue(indexOf(0.5)))
  const [gap, setGap] = useState(12)
  const [rounded, setRounded] = useState(true)
  const [square, setSquare] = useState(false)
  const [width, setWidth] = useState(0)
  const [userCollapsed, setUserCollapsed] = useState(false)
  const isMobile = useIsMobile()
  const collapsed = isMobile || userCollapsed
  const gridRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef(size)
  const cursorRight = useTransform(progress, [0, 1], [190, 46])
  const pressed = useMotionValue(1)
  const cursorScale = useTransform(pressed, [0, 1], [0.88, 1])

  useEffect(() => {
    const drive = animate(progress, [0.5, 1, 1, 0, 0, 0.5], {
      duration: 12,
      times: [0, 0.22, 0.36, 0.64, 0.82, 1],
      ease: "easeInOut",
      repeat: Infinity,
    })
    const press = animate(pressed, [1, 0, 0, 1, 1, 0, 0, 1], {
      duration: 12,
      times: [0, 0.02, 0.36, 0.4, 0.6, 0.62, 0.82, 0.86],
      repeat: Infinity,
    })
    return () => {
      drive.stop()
      press.stop()
    }
  }, [progress, pressed])

  useMotionValueEvent(progress, "change", (v) => {
    const next = toValue(indexOf(v))
    if (next !== sizeRef.current) {
      sizeRef.current = next
      setSize(next)
    }
  })

  useEffect(() => {
    const element = gridRef.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const { cells, height } = useMemo(
    () => buildLayout(TILES, width, size, gap, square),
    [width, size, gap, square],
  )

  return (
    <SuiteShell
      className="aspect-[9/16] w-full sm:aspect-[16/9]"
      sidebar={
        <SuiteSidebar
          collapsed={collapsed}
          items={NAV}
          navLabel="Library"
          header={
            <div className={cn("flex items-center gap-2 px-0.5", collapsed && "justify-center")}>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1">
                <img src="/logo.png" alt="" className="size-7 shrink-0 rounded-md" />
                {!collapsed ? (
                  <>
                    <span className="flex min-w-0 flex-col text-left leading-tight">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">Photos</span>
                        <span className="bg-primary/15 text-primary rounded px-1 py-px text-[9px] font-bold tracking-wide uppercase">
                          Beta
                        </span>
                      </span>
                      <span className="text-muted-foreground truncate text-[11px]">PolarHQ</span>
                    </span>
                    <svg
                      viewBox="0 0 16 16"
                      aria-hidden
                      className="text-muted-foreground/60 ms-auto size-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5.5 6.5 8 4l2.5 2.5M5.5 9.5 8 12l2.5-2.5" />
                    </svg>
                  </>
                ) : null}
              </div>
              {!collapsed ? (
                <img
                  src="https://api.dicebear.com/10.x/notionists-neutral/svg?seed=polarhq"
                  alt=""
                  className="bg-sidebar-accent size-7 shrink-0 rounded-full"
                />
              ) : null}
            </div>
          }
          search={
            collapsed ? null : (
              <div className="bg-muted text-muted-foreground flex h-9 items-center gap-2 rounded-xl px-2.5 text-sm">
                <Icon name="search" className="size-4 shrink-0" />
                <span className="flex-1 truncate">Search</span>
                <span className="bg-card text-muted-foreground/70 rounded px-1.5 py-0.5 text-[10px] font-medium">
                  ⌘K
                </span>
              </div>
            )
          }
          renderItem={(item) => {
            if (item.key !== "albums") return undefined
            return (
              <div className="flex flex-col gap-0.5">
                <a
                  href="#"
                  className="text-foreground/80 hover:bg-sidebar-accent/60 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition"
                >
                  <Icon name="album-3" className="size-[18px] shrink-0" />
                  {!collapsed ? (
                    <>
                      <span className="flex-1 truncate">Albums</span>
                      <svg
                        viewBox="0 0 16 16"
                        aria-hidden
                        className="text-muted-foreground/60 size-3.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m4 6 4 4 4-4" />
                      </svg>
                    </>
                  ) : null}
                </a>
                {!collapsed
                  ? ALBUMS.map((album) => (
                      <a
                        key={album.key}
                        href="#"
                        className="text-muted-foreground hover:bg-sidebar-accent/60 ms-7 flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-sm transition"
                      >
                        <span className="flex-1 truncate">{album.label}</span>
                        <span className="text-muted-foreground/60 text-xs tabular-nums">
                          {album.count}
                        </span>
                      </a>
                    ))
                  : null}
              </div>
            )
          }}
          footer={
            <StorageMeter
              collapsed={collapsed}
              percent={18}
              label="185 MB / 1.0 GB"
              footer="v0.5.0-alpha · build desktop"
            />
          }
        />
      }
      titleBar={
        <SuiteTitleBar
          collapsed={collapsed}
          onToggleSidebar={() => setUserCollapsed((value) => !value)}
          extra={
            <div className="relative inline-flex">
              <SizeControl
                open
                value={size}
                onChange={setSize}
                gap={gap}
                onGapChange={setGap}
                rounded={rounded}
                onRoundedChange={setRounded}
                square={square}
                onSquareChange={setSquare}
              />
              <motion.svg
                viewBox="0 0 24 24"
                aria-hidden
                style={{ right: cursorRight, scale: cursorScale }}
                className="pointer-events-none absolute top-[64px] z-[60] size-6 origin-top-left drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]"
              >
                <path
                  d="M5 2.5 L5 17 L8.7 13.6 L11 18.6 L13 17.8 L10.7 12.9 L15.5 12.6 Z"
                  fill="#fff"
                  stroke="#000"
                  strokeWidth="1.1"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </div>
          }
        />
      }
    >
      <div className="p-2">
        <div ref={gridRef} className="relative w-full" style={{ height }}>
          {cells.map((cell) => (
            <div
              key={cell.key}
              className={cn("bg-muted absolute overflow-hidden", rounded ? "rounded-xl" : "")}
              style={{
                left: cell.x,
                top: cell.y,
                width: cell.w,
                height: cell.h,
                transition: TILE_TRANSITION,
              }}
            >
              <Image src={cell.src} alt="" fill sizes="500px" className="object-cover" />
            </div>
          ))}
        </div>
      </div>
    </SuiteShell>
  )
}

export default PhotosDemo
