"use client"

import { useEffect, useRef, useState } from "react"
import { IconArrowBackUp, IconArrowForwardUp, IconMinus, IconPlus } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  type BoardElement,
  type BoardState,
  bounds,
  newElement,
  type Shape,
  type Style,
  type Tool,
} from "./board"
import ElementView from "./ElementView"

type Corner = "nw" | "ne" | "se" | "sw"
const CORNERS: Corner[] = ["nw", "ne", "se", "sw"]
const isBox = (el: BoardElement): boolean =>
  el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond"

type Gesture =
  | { mode: "create" }
  | { mode: "move"; id: string; start: { x: number; y: number }; orig: BoardElement }
  | { mode: "resize"; id: string; handle: Corner; orig: BoardElement }
  | { mode: "pan"; start: { x: number; y: number }; orig: { x: number; y: number } }
  | { mode: "erase" }

interface Props {
  board: BoardState
  tool: Tool
  setTool: (tool: Tool) => void
  style: Style
  selectedId: string | null
  setSelectedId: (id: string | null) => void
}

const cornerPoint = (b: { x: number; y: number; w: number; h: number }, c: Corner) =>
  c === "nw"
    ? { x: b.x, y: b.y }
    : c === "ne"
      ? { x: b.x + b.w, y: b.y }
      : c === "se"
        ? { x: b.x + b.w, y: b.y + b.h }
        : { x: b.x, y: b.y + b.h }

const BoardCanvas = ({ board, tool, setTool, style, selectedId, setSelectedId }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const spaceHeld = useRef(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [draft, setDraft] = useState<BoardElement | null>(null)
  const [editing, setEditing] = useState<string | null>(null)

  const { elements } = board
  const selected = elements.find((el) => el.id === selectedId) ?? null

  const toBoard = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: (clientX - r.left - pan.x) / zoom, y: (clientY - r.top - pan.y) / zoom }
  }

  const hitTest = (p: { x: number; y: number }): string | null => {
    for (let i = elements.length - 1; i >= 0; i -= 1) {
      const el = elements[i]!
      const b = bounds(el)
      const pad = Math.max(8, el.strokeWidth)
      if (p.x >= b.x - pad && p.x <= b.x + b.w + pad && p.y >= b.y - pad && p.y <= b.y + b.h + pad)
        return el.id
    }
    return null
  }

  const handleAt = (p: { x: number; y: number }): Corner | null => {
    if (!selected || !isBox(selected)) return null
    const b = bounds(selected)
    const r = 9 / zoom
    for (const c of CORNERS) {
      const hp = cornerPoint(b, c)
      if (Math.abs(p.x - hp.x) <= r && Math.abs(p.y - hp.y) <= r) return c
    }
    return null
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (editing) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const p = toBoard(e.clientX, e.clientY)

    if (e.button === 1 || tool === "pan" || spaceHeld.current) {
      gesture.current = { mode: "pan", start: { x: e.clientX, y: e.clientY }, orig: { ...pan } }
      return
    }
    if (tool === "select") {
      const handle = handleAt(p)
      if (handle && selected) {
        gesture.current = { mode: "resize", id: selected.id, handle, orig: selected }
        return
      }
      const hit = hitTest(p)
      setSelectedId(hit)
      if (hit) {
        const orig = elements.find((el) => el.id === hit)!
        gesture.current = { mode: "move", id: hit, start: p, orig }
      }
      return
    }
    if (tool === "eraser") {
      gesture.current = { mode: "erase" }
      const hit = hitTest(p)
      if (hit) board.remove(hit)
      return
    }
    if (tool === "text") {
      const el = newElement("text", p.x, p.y, style)
      board.add(el)
      setSelectedId(el.id)
      setEditing(el.id)
      setTool("select")
      return
    }
    const el = newElement(tool as Shape, p.x, p.y, style)
    setDraft(el)
    gesture.current = { mode: "create" }
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const g = gesture.current
    if (!g) return
    const p = toBoard(e.clientX, e.clientY)

    if (g.mode === "pan") {
      setPan({ x: g.orig.x + (e.clientX - g.start.x), y: g.orig.y + (e.clientY - g.start.y) })
      return
    }
    if (g.mode === "erase") {
      const hit = hitTest(p)
      if (hit) board.remove(hit)
      return
    }
    if (g.mode === "create") {
      setDraft((d) => {
        if (!d) return d
        if (d.type === "draw") return { ...d, points: [...(d.points ?? []), p.x - d.x, p.y - d.y] }
        if (d.type === "line" || d.type === "arrow")
          return { ...d, points: [0, 0, p.x - d.x, p.y - d.y] }
        return { ...d, w: p.x - d.x, h: p.y - d.y }
      })
      return
    }
    if (g.mode === "move") {
      const dx = p.x - g.start.x
      const dy = p.y - g.start.y
      setDraft({ ...g.orig, x: g.orig.x + dx, y: g.orig.y + dy })
      return
    }
    if (g.mode === "resize") {
      const b = bounds(g.orig)
      let { x, y, w, h } = b
      if (g.handle === "se") {
        w = p.x - b.x
        h = p.y - b.y
      } else if (g.handle === "nw") {
        x = p.x
        y = p.y
        w = b.x + b.w - p.x
        h = b.y + b.h - p.y
      } else if (g.handle === "ne") {
        y = p.y
        w = p.x - b.x
        h = b.y + b.h - p.y
      } else {
        x = p.x
        w = b.x + b.w - p.x
        h = p.y - b.y
      }
      setDraft({ ...g.orig, x, y, w, h })
    }
  }

  const onPointerUp = () => {
    const g = gesture.current
    gesture.current = null
    if (!g) return
    if (g.mode === "create" && draft) {
      const b = bounds(draft)
      const keep =
        draft.type === "draw" ? (draft.points?.length ?? 0) >= 4 : b.w >= 3 || b.h >= 3
      if (keep) {
        board.add(draft)
        setSelectedId(draft.id)
      }
      setDraft(null)
      setTool("select")
      return
    }
    if ((g.mode === "move" || g.mode === "resize") && draft) {
      const patch: Partial<BoardElement> = { x: draft.x, y: draft.y, w: draft.w, h: draft.h }
      board.update(g.id, patch)
      setDraft(null)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") return
      if (e.key === " ") spaceHeld.current = true
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && !editing) {
        board.remove(selectedId)
        setSelectedId(null)
      }
      if (e.key === "Escape") {
        setSelectedId(null)
        setDraft(null)
        setEditing(null)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") spaceHeld.current = false
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [board, selectedId, editing, setSelectedId])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = svg.getBoundingClientRect()
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.0015)
        const nz = Math.min(5, Math.max(0.1, zoom * factor))
        const bx = (e.clientX - r.left - pan.x) / zoom
        const by = (e.clientY - r.top - pan.y) / zoom
        setPan({ x: e.clientX - r.left - bx * nz, y: e.clientY - r.top - by * nz })
        setZoom(nz)
      } else {
        setPan({ x: pan.x - e.deltaX, y: pan.y - e.deltaY })
      }
    }
    svg.addEventListener("wheel", onWheel, { passive: false })
    return () => svg.removeEventListener("wheel", onWheel)
  }, [pan, zoom])

  const cursor =
    tool === "pan"
      ? "grab"
      : tool === "select"
        ? "default"
        : tool === "eraser"
          ? "cell"
          : "crosshair"

  const visible = elements.filter((el) => el.id !== draft?.id)
  const selBounds = selected ? bounds(selected) : null
  const editEl = editing ? elements.find((el) => el.id === editing) : null

  return (
    <div className="bg-background relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        className="h-full w-full touch-none"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <defs>
          <pattern id="wb-dots" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" className="fill-muted-foreground/25" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#wb-dots)" />
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {visible.map((el) => (
            <ElementView key={el.id} el={el} />
          ))}
          {draft ? <ElementView el={draft} /> : null}

          {selBounds && !editing ? (
            <g>
              <rect
                x={selBounds.x - 4 / zoom}
                y={selBounds.y - 4 / zoom}
                width={selBounds.w + 8 / zoom}
                height={selBounds.h + 8 / zoom}
                fill="none"
                className="stroke-primary"
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${4 / zoom} ${3 / zoom}`}
              />
              {selected && isBox(selected)
                ? CORNERS.map((c) => {
                    const hp = cornerPoint(selBounds, c)
                    const s = 8 / zoom
                    return (
                      <rect
                        key={c}
                        x={hp.x - s / 2}
                        y={hp.y - s / 2}
                        width={s}
                        height={s}
                        className="fill-background stroke-primary"
                        strokeWidth={1.5 / zoom}
                        rx={1 / zoom}
                      />
                    )
                  })
                : null}
            </g>
          ) : null}
        </g>
      </svg>

      {editEl ? (
        <textarea
          autoFocus
          defaultValue={editEl.text ?? ""}
          onBlur={(e) => {
            board.update(editEl.id, { text: e.target.value })
            if (!e.target.value.trim()) board.remove(editEl.id)
            setEditing(null)
          }}
          className="text-foreground absolute resize-none overflow-hidden border-none bg-transparent p-0 leading-tight outline-none"
          style={{
            left: editEl.x * zoom + pan.x,
            top: editEl.y * zoom + pan.y,
            fontSize: (editEl.fontSize ?? 24) * zoom,
            color: editEl.stroke,
            fontFamily: "var(--font-sans, sans-serif)",
            minWidth: 120 * zoom,
          }}
        />
      ) : null}

      <div className="bg-card absolute bottom-4 left-4 flex items-center gap-0.5 rounded-lg border p-1 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
        >
          <IconMinus className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="min-w-12 font-normal tabular-nums"
          aria-label="Reset zoom"
          onClick={() => {
            setZoom(1)
            setPan({ x: 0, y: 0 })
          }}
        >
          {Math.round(zoom * 100)}%
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(5, z + 0.1))}
        >
          <IconPlus className="size-4" />
        </Button>
        <div className="bg-border mx-1 h-5 w-px" />
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Undo"
          onClick={() => board.undo()}
        >
          <IconArrowBackUp className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label="Redo"
          onClick={() => board.redo()}
        >
          <IconArrowForwardUp className="size-4" />
        </Button>
      </div>
    </div>
  )
}

export default BoardCanvas
