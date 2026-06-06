"use client"

import { useEffect, useState } from "react"
import type { CollabDocument } from "@lib/useCollabDocument"
import { IconPlayerPlay } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import CollabHeader from "@components/CollabHeader/CollabHeader"
import CollabBoundary from "@pages/Collab/CollabBoundary"
import PresentMode from "@pages/Slides/components/PresentMode/PresentMode"
import SlideCanvas from "@pages/Slides/components/SlideCanvas/SlideCanvas"
import SlideRail from "@pages/Slides/components/SlideRail/SlideRail"

const SlidesWorkspace = ({ nodeId, collab }: { nodeId: string; collab: CollabDocument }) => {
  const { ydoc } = collab
  const [slides] = useState(() => ydoc.getArray<string>("slides"))
  const [slideIds, setSlideIds] = useState<string[]>(() => slides.toArray())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [presenting, setPresenting] = useState(false)

  useEffect(() => {
    if (slides.length === 0) slides.push([crypto.randomUUID()])
    const sync = () => {
      const ids = slides.toArray()
      setSlideIds(ids)
      setActiveId((current) => (current && ids.includes(current) ? current : (ids[0] ?? null)))
    }
    slides.observe(sync)
    sync()
    return () => slides.unobserve(sync)
  }, [slides])

  const addSlide = () => {
    const id = crypto.randomUUID()
    slides.push([id])
    setActiveId(id)
  }
  const deleteSlide = (id: string) => {
    const index = slides.toArray().indexOf(id)
    if (index >= 0) slides.delete(index, 1)
  }

  if (presenting) {
    return (
      <PresentMode
        ydoc={ydoc}
        slideIds={slideIds}
        startIndex={Math.max(0, slideIds.indexOf(activeId ?? ""))}
        onExit={() => setPresenting(false)}
      />
    )
  }

  return (
    <div className="flex min-h-full flex-1 flex-col gap-3 p-4">
      <CollabHeader
        nodeId={nodeId}
        doc={collab.doc!}
        provider={collab.provider!}
        encrypted={collab.encrypted}
        saveState={collab.saveState}
        lastSavedAt={collab.lastSavedAt}
        onSave={() => void collab.save()}
        tools={
          <Button
            variant="ghost"
            size="sm"
            disabled={slideIds.length === 0}
            onClick={() => setPresenting(true)}
          >
            <IconPlayerPlay className="size-4" />
            Present
          </Button>
        }
      />
      <div className="flex min-h-0 flex-1 gap-3">
        <SlideRail
          ydoc={ydoc}
          slideIds={slideIds}
          activeId={activeId}
          onSelect={setActiveId}
          onAdd={addSlide}
          onDelete={deleteSlide}
        />
        <div className="scrollbar-slim min-w-0 flex-1 overflow-auto py-2">
          {activeId ? <SlideCanvas key={activeId} ydoc={ydoc} slideId={activeId} editable /> : null}
        </div>
      </div>
    </div>
  )
}

const Editor = ({ nodeId }: { nodeId: string }) => (
  <CollabBoundary
    nodeId={nodeId}
    backHref="/slides"
    render={(collab) => <SlidesWorkspace nodeId={nodeId} collab={collab} />}
  />
)

export default Editor
