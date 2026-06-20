import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"

const MIN_SCALE = 0.25
const MAX_SCALE = 3
const STEP = 0.25

const clampScale = (value: number): number => Math.max(MIN_SCALE, Math.min(MAX_SCALE, value))
const clamp = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value))

interface Point {
  x: number
  y: number
}

export interface ZoomPan {
  scale: number
  offset: Point
  /** True when zoomed (in or out) — panning is allowed only then, never at 100%. */
  canPan: boolean
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  stageRef: RefObject<HTMLDivElement | null>
  stageHandlers: {
    onPointerDown: (event: ReactPointerEvent) => void
    onPointerMove: (event: ReactPointerEvent) => void
    onPointerUp: (event: ReactPointerEvent) => void
    onPointerCancel: (event: ReactPointerEvent) => void
  }
}

/**
 * Pinch / wheel / button zoom with drag-to-pan for a full-screen media stage. Panning is
 * enabled whenever the image is zoomed in or out, and disabled at exactly 100%. Pass a
 * `resetKey` (e.g. the current item id) to snap back to 100% when the viewed item changes.
 */
export const useZoomPan = (resetKey?: unknown): ZoomPan => {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const stageRef = useRef<HTMLDivElement>(null)
  const pointers = useRef<Map<number, Point>>(new Map())
  const pinch = useRef<{ dist: number; scale: number } | null>(null)
  const pan = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null)

  useEffect(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [resetKey])

  useEffect(() => {
    if (scale === 1) setOffset({ x: 0, y: 0 })
  }, [scale])

  useEffect(() => {
    const element = stageRef.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      setScale((value) => clampScale(value - event.deltaY * 0.01))
    }
    element.addEventListener("wheel", onWheel, { passive: false })
    return () => element.removeEventListener("wheel", onWheel)
  }, [])

  const pinchDistance = (): number => {
    const points = [...pointers.current.values()]
    return points.length < 2
      ? 0
      : Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y)
  }

  const clampOffset = (next: Point, atScale: number): Point => {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return next
    const maxX = (rect.width * Math.abs(atScale - 1)) / 2
    const maxY = (rect.height * Math.abs(atScale - 1)) / 2
    return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) }
  }

  const onPointerDown = (event: ReactPointerEvent) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.current.size === 2) {
      pinch.current = { dist: pinchDistance(), scale }
      pan.current = null
    } else if (scale !== 1) {
      pan.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        ox: offset.x,
        oy: offset.y,
      }
      stageRef.current?.setPointerCapture(event.pointerId)
    }
  }

  const onPointerMove = (event: ReactPointerEvent) => {
    if (pointers.current.has(event.pointerId)) {
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }
    const startPinch = pinch.current
    if (pointers.current.size === 2 && startPinch && startPinch.dist > 0) {
      setScale(clampScale(startPinch.scale * (pinchDistance() / startPinch.dist)))
      return
    }
    const startPan = pan.current
    if (startPan && startPan.id === event.pointerId) {
      setOffset(
        clampOffset(
          {
            x: startPan.ox + (event.clientX - startPan.x),
            y: startPan.oy + (event.clientY - startPan.y),
          },
          scale,
        ),
      )
    }
  }

  const onPointerUp = (event: ReactPointerEvent) => {
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pan.current?.id === event.pointerId) pan.current = null
  }

  const zoomIn = () => setScale((value) => clampScale(Number((value + STEP).toFixed(2))))
  const zoomOut = () => setScale((value) => clampScale(Number((value - STEP).toFixed(2))))
  const reset = () => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  return {
    scale,
    offset,
    canPan: scale !== 1,
    zoomIn,
    zoomOut,
    reset,
    stageRef,
    stageHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
    },
  }
}
