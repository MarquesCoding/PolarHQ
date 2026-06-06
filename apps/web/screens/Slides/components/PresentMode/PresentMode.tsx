"use client"

import { useEffect, useState } from "react"
import { IconX } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import type * as Y from "yjs"
import SlideCanvas from "@pages/Slides/components/SlideCanvas/SlideCanvas"

interface PresentModeProps {
  ydoc: Y.Doc
  slideIds: string[]
  startIndex: number
  onExit: () => void
}

/** Fullscreen slideshow: arrow keys / click to advance, Esc to exit. */
const PresentMode = ({ ydoc, slideIds, startIndex, onExit }: PresentModeProps) => {
  const [index, setIndex] = useState(Math.max(0, startIndex))
  const go = (delta: number) =>
    setIndex((value) => Math.max(0, Math.min(slideIds.length - 1, value + delta)))

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onExit()
      else if (event.key === "ArrowRight" || event.key === " ") go(1)
      else if (event.key === "ArrowLeft") go(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [slideIds.length, onExit])

  const id = slideIds[index]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black p-10"
      onClick={() => go(1)}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Exit presentation"
        onClick={(event) => {
          event.stopPropagation()
          onExit()
        }}
        className="absolute top-4 right-4 text-white hover:bg-white/10"
      >
        <IconX className="size-5" />
      </Button>

      <div className="w-full max-w-6xl" onClick={(event) => event.stopPropagation()}>
        {id ? <SlideCanvas key={id} ydoc={ydoc} slideId={id} editable={false} /> : null}
      </div>

      <div className="absolute bottom-4 text-sm text-white/60 tabular-nums">
        {index + 1} / {slideIds.length}
      </div>
    </div>
  )
}

export default PresentMode
