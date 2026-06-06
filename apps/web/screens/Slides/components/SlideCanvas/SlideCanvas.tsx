"use client"

import { type PointerEvent, useEffect, useRef, useState } from "react"
import {
  IconCircle,
  IconLetterT,
  IconPhoto,
  IconSquare,
  IconTrash,
} from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import type * as Y from "yjs"
import SlideTextBox from "@pages/Slides/components/SlideCanvas/SlideTextBox"

type ElementType = "text" | "rect" | "ellipse" | "image"
interface Geom {
  x: number
  y: number
  w: number
  h: number
}
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

interface SlideCanvasProps {
  ydoc: Y.Doc
  slideId: string
  editable: boolean
}

/** A slide's free-positioned elements (text/shape/image), draggable + resizable. */
const SlideCanvas = ({ ydoc, slideId, editable }: SlideCanvasProps) => {
  const [els] = useState(() => ydoc.getArray<string>(`slide:${slideId}:els`))
  const [elIds, setElIds] = useState<string[]>(() => els.toArray())
  const [, force] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ id: string } & Geom | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onEls = () => setElIds(els.toArray())
    const onAny = () => force((v) => v + 1)
    els.observe(onEls)
    ydoc.on("update", onAny)
    onEls()
    return () => {
      els.unobserve(onEls)
      ydoc.off("update", onAny)
    }
  }, [els, ydoc])

  const elMap = (id: string) => ydoc.getMap<unknown>(`el:${id}`)
  const geomOf = (id: string): Geom => {
    const m = elMap(id)
    return {
      x: (m.get("x") as number) ?? 0.1,
      y: (m.get("y") as number) ?? 0.1,
      w: (m.get("w") as number) ?? 0.3,
      h: (m.get("h") as number) ?? 0.2,
    }
  }
  const typeOf = (id: string) => elMap(id).get("type") as ElementType

  const addElement = (type: ElementType) => {
    const id = crypto.randomUUID()
    let src: string | null = null
    if (type === "image") {
      src = window.prompt("Image URL")
      if (!src) return
    }
    ydoc.transact(() => {
      const m = elMap(id)
      m.set("type", type)
      m.set("x", 0.3)
      m.set("y", 0.35)
      m.set("w", type === "text" ? 0.4 : 0.25)
      m.set("h", type === "text" ? 0.15 : 0.25)
      if (type === "rect" || type === "ellipse") m.set("fill", "#3b82f6")
      if (src) m.set("src", src)
      els.push([id])
    })
    setSelected(id)
  }

  const deleteElement = (id: string) => {
    const index = els.toArray().indexOf(id)
    if (index >= 0) els.delete(index, 1)
    if (selected === id) setSelected(null)
  }

  const canvasSize = () => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return { w: rect?.width ?? 1, h: rect?.height ?? 1 }
  }

  const beginDrag = (event: PointerEvent, id: string, mode: "move" | "resize") => {
    if (!editable || editingId === id) return
    event.preventDefault()
    event.stopPropagation()
    setSelected(id)
    const start = geomOf(id)
    const cs = canvasSize()
    const sx = event.clientX
    const sy = event.clientY
    const onMove = (ev: globalThis.PointerEvent) => {
      const dx = (ev.clientX - sx) / cs.w
      const dy = (ev.clientY - sy) / cs.h
      if (mode === "move") {
        setDrag({
          id,
          ...start,
          x: clamp(start.x + dx, 0, 1 - start.w),
          y: clamp(start.y + dy, 0, 1 - start.h),
        })
      } else {
        setDrag({
          id,
          ...start,
          w: clamp(start.w + dx, 0.05, 1 - start.x),
          h: clamp(start.h + dy, 0.05, 1 - start.y),
        })
      }
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      setDrag((d) => {
        if (d) {
          const m = elMap(d.id)
          ydoc.transact(() => {
            m.set("x", d.x)
            m.set("y", d.y)
            m.set("w", d.w)
            m.set("h", d.h)
          })
        }
        return null
      })
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const renderElement = (id: string) => {
    const type = typeOf(id)
    const g = drag?.id === id ? drag : geomOf(id)
    const m = elMap(id)
    const isSelected = editable && selected === id
    return (
      <div
        key={id}
        onPointerDown={(event) => beginDrag(event, id, "move")}
        onClick={(event) => {
          event.stopPropagation()
          if (editable) setSelected(id)
        }}
        onDoubleClick={() => type === "text" && editable && setEditingId(id)}
        style={{
          left: `${g.x * 100}%`,
          top: `${g.y * 100}%`,
          width: `${g.w * 100}%`,
          height: `${g.h * 100}%`,
        }}
        className={cn(
          "absolute",
          editable && (editingId === id ? "cursor-text" : "cursor-move"),
          isSelected && "ring-primary ring-2",
        )}
      >
        {type === "text" ? (
          <SlideTextBox
            ydoc={ydoc}
            elId={id}
            editable={editable && editingId === id}
            color={m.get("color") as string | undefined}
          />
        ) : type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.get("src") as string}
            alt=""
            draggable={false}
            className="h-full w-full object-contain"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{
              backgroundColor: m.get("fill") as string,
              borderRadius: type === "ellipse" ? "50%" : "8px",
            }}
          />
        )}
        {isSelected ? (
          <div
            onPointerDown={(event) => beginDrag(event, id, "resize")}
            className="border-background bg-primary absolute -right-1.5 -bottom-1.5 size-3 cursor-nwse-resize rounded-sm border"
          />
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {editable ? (
        <div className="bg-card/80 mx-auto flex w-full max-w-4xl items-center gap-0.5 rounded-xl border px-2 py-1.5">
          <Button variant="ghost" size="sm" onClick={() => addElement("text")}>
            <IconLetterT className="size-4" />
            Text
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Rectangle" onClick={() => addElement("rect")}>
            <IconSquare className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Ellipse" onClick={() => addElement("ellipse")}>
            <IconCircle className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Image" onClick={() => addElement("image")}>
            <IconPhoto className="size-4" />
          </Button>
          {selected ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete element"
              className="ml-auto"
              onClick={() => deleteElement(selected)}
            >
              <IconTrash className="size-4" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div
        ref={canvasRef}
        onPointerDown={() => {
          setSelected(null)
          setEditingId(null)
        }}
        className={cn(
          "relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-xl",
          editable ? "bg-card border" : "bg-white",
        )}
      >
        {elIds.map(renderElement)}
      </div>
    </div>
  )
}

export default SlideCanvas
