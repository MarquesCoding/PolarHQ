import { useEffect, useMemo, useReducer } from "react"
import * as Y from "yjs"

export type Shape =
  | "rectangle"
  | "diamond"
  | "ellipse"
  | "line"
  | "arrow"
  | "draw"
  | "text"
  | "image"
export type Tool = "select" | "pan" | "rectangle" | "diamond" | "ellipse" | "arrow" | "line" | "draw" | "text" | "eraser"

export interface BoardElement {
  id: string
  type: Shape
  x: number
  y: number
  w: number
  h: number
  /** For draw/line/arrow: flattened points [x0,y0,x1,y1,…] relative to (x,y). */
  points?: number[]
  text?: string
  /** For image elements: a data URL. */
  src?: string
  /** Rotation in radians, about the element's bounding-box center. */
  angle?: number
  stroke: string
  fill: string
  strokeWidth: number
  /** 0–100. */
  opacity: number
  fontSize?: number
}

/** Rotate a point around a pivot by `angle` radians. */
export const rotatePoint = (
  p: { x: number; y: number },
  pivot: { x: number; y: number },
  angle: number,
): { x: number; y: number } => {
  const s = Math.sin(angle)
  const c = Math.cos(angle)
  const dx = p.x - pivot.x
  const dy = p.y - pivot.y
  return { x: pivot.x + dx * c - dy * s, y: pivot.y + dx * s + dy * c }
}

/** The element's bounding-box center (rotation pivot). */
export const centerOf = (el: BoardElement): { x: number; y: number } => {
  const b = bounds(el)
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 }
}

export interface Style {
  stroke: string
  fill: string
  strokeWidth: number
  opacity: number
}

export const DEFAULT_STYLE: Style = {
  stroke: "#1e1e1e",
  fill: "transparent",
  strokeWidth: 2,
  opacity: 100,
}

export const STROKE_COLORS = ["#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00"]
export const FILL_COLORS = ["transparent", "#ffc9c9", "#b2f2bb", "#a5d8ff", "#ffec99"]
export const STROKE_WIDTHS: { label: string; value: number }[] = [
  { label: "Thin", value: 2 },
  { label: "Bold", value: 4 },
  { label: "Extra bold", value: 7 },
]

const uid = (): string => crypto.randomUUID()

const hasPoints = (type: Shape): boolean => type === "draw" || type === "line" || type === "arrow"

/** A fresh element of `type` anchored at (x,y), inheriting the active style. */
export const newElement = (type: Shape, x: number, y: number, style: Style): BoardElement => ({
  id: uid(),
  type,
  x,
  y,
  w: 0,
  h: 0,
  stroke: style.stroke,
  fill: style.fill,
  strokeWidth: style.strokeWidth,
  opacity: style.opacity,
  ...(hasPoints(type) ? { points: [0, 0] } : {}),
  ...(type === "text" ? { text: "", fontSize: 24 } : {}),
})

/** The element's axis-aligned bounds with positive width/height. */
export const bounds = (el: BoardElement): { x: number; y: number; w: number; h: number } => {
  const pts = el.points
  if (pts && pts.length >= 2) {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (let i = 0; i < pts.length - 1; i += 2) {
      const px = el.x + pts[i]!
      const py = el.y + pts[i + 1]!
      minX = Math.min(minX, px)
      minY = Math.min(minY, py)
      maxX = Math.max(maxX, px)
      maxY = Math.max(maxY, py)
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
  }
  return {
    x: el.w < 0 ? el.x + el.w : el.x,
    y: el.h < 0 ? el.y + el.h : el.y,
    w: Math.abs(el.w),
    h: Math.abs(el.h),
  }
}

/** Absolute endpoint/mid handle positions for a line/arrow element. */
export const linePoints = (el: BoardElement): { x: number; y: number }[] => {
  const pts = el.points ?? []
  const result: { x: number; y: number }[] = []
  for (let i = 0; i < pts.length - 1; i += 2) result.push({ x: el.x + pts[i]!, y: el.y + pts[i + 1]! })
  return result
}

const elementsArray = (ydoc: Y.Doc) => ydoc.getArray<Y.Map<unknown>>("wb:elements")

const toYMap = (el: BoardElement): Y.Map<unknown> => {
  const map = new Y.Map<unknown>()
  Object.entries(el).forEach(([key, value]) => map.set(key, value))
  return map
}

const indexOf = (arr: Y.Array<Y.Map<unknown>>, id: string): number => {
  let found = -1
  arr.forEach((map, i) => {
    if (map.get("id") === id) found = i
  })
  return found
}

export const boardApi = (ydoc: Y.Doc) => {
  const arr = elementsArray(ydoc)
  const tx = (fn: () => void) => ydoc.transact(fn)
  return {
    add(el: BoardElement): void {
      tx(() => arr.push([toYMap(el)]))
    },
    update(id: string, patch: Partial<BoardElement>): void {
      tx(() => {
        const idx = indexOf(arr, id)
        if (idx === -1) return
        const map = arr.get(idx)
        Object.entries(patch).forEach(([key, value]) => map.set(key, value))
      })
    },
    remove(id: string): void {
      tx(() => {
        const idx = indexOf(arr, id)
        if (idx !== -1) arr.delete(idx, 1)
      })
    },
    reorder(id: string, to: "front" | "back" | "forward" | "backward"): void {
      tx(() => {
        const idx = indexOf(arr, id)
        if (idx === -1) return
        const json = arr.get(idx).toJSON() as BoardElement
        const target =
          to === "front"
            ? arr.length - 1
            : to === "back"
              ? 0
              : to === "forward"
                ? Math.min(arr.length - 1, idx + 1)
                : Math.max(0, idx - 1)
        if (target === idx) return
        arr.delete(idx, 1)
        arr.insert(target, [toYMap(json)])
      })
    },
  }
}

export type BoardApi = ReturnType<typeof boardApi>

export interface BoardState extends BoardApi {
  elements: BoardElement[]
  undo: () => void
  redo: () => void
}

/** Binds the whiteboard's Yjs element list to React and exposes the mutation + undo API. */
export const useBoard = (ydoc: Y.Doc): BoardState => {
  const arr = useMemo(() => elementsArray(ydoc), [ydoc])
  const api = useMemo(() => boardApi(ydoc), [ydoc])
  const undoManager = useMemo(() => new Y.UndoManager(arr), [arr])
  const [, rerender] = useReducer((count: number) => count + 1, 0)

  useEffect(() => {
    const onChange = () => rerender()
    arr.observeDeep(onChange)
    return () => arr.unobserveDeep(onChange)
  }, [arr])

  useEffect(() => () => undoManager.destroy(), [undoManager])

  return {
    elements: arr.toJSON() as BoardElement[],
    ...api,
    undo: () => undoManager.undo(),
    redo: () => undoManager.redo(),
  }
}
