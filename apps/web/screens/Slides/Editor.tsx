"use client"

import { useEffect, useState } from "react"
import { applyImportName, applySlidesImport, takeImport } from "@lib/importFlow"
import type { CollabDocument } from "@lib/useCollabDocument"
import { IconPlayerPlay } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import CollabHeader from "@components/CollabHeader/CollabHeader"
import CollabBoundary from "@pages/Collab/CollabBoundary"
import PresentMode from "@pages/Slides/components/PresentMode/PresentMode"
import SlideCanvas from "@pages/Slides/components/SlideCanvas/SlideCanvas"
import SlideRail from "@pages/Slides/components/SlideRail/SlideRail"
import SlidesMenuBar from "@pages/Slides/components/SlidesMenuBar/SlidesMenuBar"

const SlidesWorkspace = ({ nodeId, collab }: { nodeId: string; collab: CollabDocument }) => {
  const { ydoc } = collab
  const [slides] = useState(() => ydoc.getArray<string>("slides"))
  const [slideIds, setSlideIds] = useState<string[]>(() => slides.toArray())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [presenting, setPresenting] = useState(false)

  useEffect(() => {
    if (slides.length === 0) {
      const payload = takeImport(nodeId)
      if (payload && payload.kind === "slides" && payload.slides.length > 0) {
        applySlidesImport(ydoc, slides, payload.slides)
        applyImportName(nodeId, payload.name, collab.contentKey)
      } else {
        slides.push([crypto.randomUUID()])
      }
    }
    const sync = () => {
      const ids = slides.toArray()
      setSlideIds(ids)
      setActiveId((current) => (current && ids.includes(current) ? current : (ids[0] ?? null)))
    }
    slides.observe(sync)
    sync()
    return () => slides.unobserve(sync)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides])

  const addSlide = () => {
    const id = crypto.randomUUID()
    slides.push([id])
    setActiveId(id)
  }

  const exportPptx = async () => {
    const data = slideIds.map((slideId) => {
      const elementIds = ydoc.getArray<string>(`slide:${slideId}:els`).toArray()
      const elements = elementIds.map((elId) => {
        const map = ydoc.getMap<unknown>(`el:${elId}`)
        const base = {
          type: (map.get("type") as "text" | "rect" | "ellipse" | "image") ?? "text",
          x: (map.get("x") as number) ?? 0.1,
          y: (map.get("y") as number) ?? 0.1,
          w: (map.get("w") as number) ?? 0.3,
          h: (map.get("h") as number) ?? 0.2,
        }
        if (base.type === "text") {
          const text = ydoc
            .getXmlFragment(`el:${elId}:text`)
            .toArray()
            .map((node) => node.toString().replace(/<[^>]*>/g, ""))
            .join("\n")
            .trim()
          return { ...base, text, color: map.get("color") as string | undefined }
        }
        if (base.type === "image") return { ...base, src: map.get("src") as string | undefined }
        return { ...base, fill: map.get("fill") as string | undefined }
      })
      return { elements }
    })
    try {
      const { exportPresentation } = await import("@lib/officeExport")
      await exportPresentation(data, collab.doc?.name || "Presentation")
    } catch {
      toast.error("Could not export")
    }
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
    <div className="bg-background flex h-svh flex-col overflow-hidden">
      <div className="bg-card border-b px-3 py-2">
        <CollabHeader
          nodeId={nodeId}
          doc={collab.doc!}
          provider={collab.provider!}
          encrypted={collab.encrypted}
          saveState={collab.saveState}
          lastSavedAt={collab.lastSavedAt}
          onSave={() => void collab.save()}
          contentKey={collab.contentKey}
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
      </div>
      <SlidesMenuBar
        onNewSlide={addSlide}
        onDeleteSlide={() => activeId && deleteSlide(activeId)}
        onPresent={() => setPresenting(true)}
        onExport={() => void exportPptx()}
        canDelete={slideIds.length > 1 && !!activeId}
      />
      <div className="flex min-h-0 flex-1 gap-3 p-3">
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
