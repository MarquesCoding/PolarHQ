"use client"

import { useEffect, useState } from "react"
import { IconPlus, IconTrash } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import type * as Y from "yjs"
import { textFragmentName } from "@pages/Slides/components/SlideCanvas/SlideTextBox"

const snippet = (ydoc: Y.Doc, id: string): string =>
  ydoc
    .getArray<string>(`slide:${id}:els`)
    .toArray()
    .map((elId) =>
      ydoc.getMap(`el:${elId}`).get("type") === "text"
        ? ydoc.getXmlFragment(textFragmentName(elId)).toString()
        : "",
    )
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

interface SlideRailProps {
  ydoc: Y.Doc
  slideIds: string[]
  activeId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
}

/** Left rail of slide thumbnails with add / delete / select. */
const SlideRail = ({ ydoc, slideIds, activeId, onSelect, onAdd, onDelete }: SlideRailProps) => {
  const [, force] = useState(0)

  useEffect(() => {
    const observer = () => force((value) => value + 1)
    ydoc.on("update", observer)
    return () => ydoc.off("update", observer)
  }, [ydoc])

  return (
    <aside className="panel flex w-44 shrink-0 flex-col gap-2 overflow-y-auto rounded-xl p-2 scrollbar-slim">
      {slideIds.map((id, index) => {
        const text = snippet(ydoc, id)
        return (
          <div
            key={id}
            onClick={() => onSelect(id)}
            className={cn(
              "group relative flex cursor-pointer gap-2 rounded-lg p-1.5 transition",
              activeId === id ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50",
            )}
          >
            <span className="text-muted-foreground w-4 shrink-0 pt-0.5 text-right text-xs">
              {index + 1}
            </span>
            <div className="bg-card flex aspect-video flex-1 items-center overflow-hidden rounded border px-1.5">
              <span className="text-muted-foreground line-clamp-3 text-[0.6rem] leading-tight">
                {text || "Empty slide"}
              </span>
            </div>
            {slideIds.length > 1 ? (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="Delete slide"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(id)
                }}
                className="bg-background/70 absolute top-1 right-1 opacity-0 transition group-hover:opacity-100"
              >
                <IconTrash className="size-3" />
              </Button>
            ) : null}
          </div>
        )
      })}

      <Button variant="outline" size="sm" onClick={onAdd}>
        <IconPlus className="size-4" />
        Slide
      </Button>
    </aside>
  )
}

export default SlideRail
