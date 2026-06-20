import { type PointerEvent as ReactPointerEvent, useRef, useState } from "react"
import type { DriveNode } from "@workspace/core/drive"
import { usePersistentNumber } from "@workspace/screens/persistentSetting"
import type { SelectionApi } from "@workspace/screens/selection"
import NodeCard from "@pages/Drive/components/NodeCard/NodeCard"
import NodeContextMenu, {
  type DriveNodeActions,
} from "@pages/Drive/components/NodeContextMenu/NodeContextMenu"
import ParentCard from "@pages/Drive/components/ParentCard/ParentCard"

interface Marquee {
  x0: number
  y0: number
  x1: number
  y1: number
}

interface NodeGridProps {
  nodes: DriveNode[]
  selection: SelectionApi
  onOpen: (node: DriveNode) => void
  onDropNodes?: (folder: DriveNode, ids: string[]) => void
  onSpringInto?: (folder: DriveNode) => void
  onParentOpen?: () => void
  onParentDrop?: (ids: string[]) => void
  actions?: DriveNodeActions
}

/** Grid of Drive nodes wired for selection, range-select, drag-to-folder, and right-click actions. */
const NodeGrid = ({
  nodes,
  selection,
  onOpen,
  onDropNodes,
  onSpringInto,
  onParentOpen,
  onParentDrop,
  actions,
}: NodeGridProps) => {
  const [tileSize] = usePersistentNumber("drive.tileSize", 150)
  const ordered = nodes.map((node) => node.id)

  const containerRef = useRef<HTMLDivElement>(null)
  const [marquee, setMarquee] = useState<Marquee | null>(null)
  const pointerId = useRef<number | null>(null)
  const startPoint = useRef<{ x: number; y: number } | null>(null)
  const marqueeBase = useRef<Set<string>>(new Set())
  const dragging = useRef(false)

  const select = (node: DriveNode, shiftKey: boolean, additive: boolean) => {
    if (shiftKey) selection.rangeTo(node.id, ordered)
    else if (additive) selection.toggle(node.id, ordered)
    else selection.selectOnly(node.id)
  }

  const dragIdsFor = (node: DriveNode): string[] =>
    selection.isSelected(node.id) && selection.count > 0 ? [...selection.selected] : [node.id]

  const pointFromEvent = (event: ReactPointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) }
  }

  const onMarqueeDown = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return
    if ((event.target as HTMLElement).closest("[data-node-card]")) return
    pointerId.current = event.pointerId
    startPoint.current = pointFromEvent(event)
    marqueeBase.current = event.shiftKey ? new Set(selection.selected) : new Set()
    dragging.current = false
  }

  const onMarqueeMove = (event: ReactPointerEvent) => {
    if (pointerId.current !== event.pointerId || !startPoint.current) return
    const start = startPoint.current
    const point = pointFromEvent(event)
    if (!dragging.current) {
      if (Math.abs(point.x - start.x) < 8 && Math.abs(point.y - start.y) < 8) return
      dragging.current = true
      containerRef.current?.setPointerCapture(event.pointerId)
    }
    const rect: Marquee = {
      x0: Math.min(start.x, point.x),
      y0: Math.min(start.y, point.y),
      x1: Math.max(start.x, point.x),
      y1: Math.max(start.y, point.y),
    }
    setMarquee(rect)
    const container = containerRef.current
    if (!container) return
    const base = container.getBoundingClientRect()
    const hits = new Set(marqueeBase.current)
    container.querySelectorAll<HTMLElement>("[data-node-card]").forEach((element) => {
      const cell = element.getBoundingClientRect()
      const overlap = !(
        cell.left - base.left > rect.x1 ||
        cell.right - base.left < rect.x0 ||
        cell.top - base.top > rect.y1 ||
        cell.bottom - base.top < rect.y0
      )
      const id = element.dataset.nodeCard
      if (overlap && id) hits.add(id)
    })
    selection.selectAll([...hits])
  }

  const onMarqueeUp = (event: ReactPointerEvent) => {
    if (pointerId.current !== event.pointerId) return
    if (dragging.current) {
      containerRef.current?.releasePointerCapture(event.pointerId)
      setMarquee(null)
      setTimeout(() => {
        dragging.current = false
      }, 0)
    }
    pointerId.current = null
    startPoint.current = null
  }

  return (
    <div
      ref={containerRef}
      className="relative grid flex-1 content-start justify-start gap-3"
      style={{ gridTemplateColumns: `repeat(auto-fill, ${tileSize}px)` }}
      onPointerDown={onMarqueeDown}
      onPointerMove={onMarqueeMove}
      onPointerUp={onMarqueeUp}
      onPointerCancel={onMarqueeUp}
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
      {onParentOpen ? (
        <ParentCard onOpen={onParentOpen} onDrop={(ids) => onParentDrop?.(ids)} />
      ) : null}
      {nodes.map((node) => {
        const card = (
          <NodeCard
            node={node}
            selected={selection.isSelected(node.id)}
            onOpen={onOpen}
            onSelect={select}
            onToggle={(target) => selection.toggle(target.id, ordered)}
            dragIds={dragIdsFor(node)}
            onDropNodes={onDropNodes}
            onSpringInto={onSpringInto}
          />
        )
        return actions ? (
          <NodeContextMenu key={node.id} node={node} actions={actions}>
            {card}
          </NodeContextMenu>
        ) : (
          <div key={node.id}>{card}</div>
        )
      })}
    </div>
  )
}

export default NodeGrid
