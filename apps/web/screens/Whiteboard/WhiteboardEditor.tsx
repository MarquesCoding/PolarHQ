"use client"

import { useState } from "react"
import type { CollabDocument } from "@lib/useCollabDocument"
import CollabHeader from "@components/CollabHeader/CollabHeader"
import CollabBoundary from "@pages/Collab/CollabBoundary"
import BoardCanvas from "./BoardCanvas"
import { DEFAULT_STYLE, type Style, type Tool, useBoard } from "./board"
import PropertiesPanel from "./components/PropertiesPanel"
import Toolbar from "./components/Toolbar"

const BoardWorkspace = ({ nodeId, collab }: { nodeId: string; collab: CollabDocument }) => {
  const board = useBoard(collab.ydoc)
  const [tool, setTool] = useState<Tool>("select")
  const [style, setStyle] = useState<Style>(DEFAULT_STYLE)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = board.elements.find((el) => el.id === selectedId) ?? null
  const current = selected
    ? {
        stroke: selected.stroke,
        fill: selected.fill,
        strokeWidth: selected.strokeWidth,
        opacity: selected.opacity,
      }
    : style

  const onStyle = (patch: Partial<Style>) => {
    setStyle((prev) => ({ ...prev, ...patch }))
    if (selected) board.update(selected.id, patch)
  }

  const showPanel = selected !== null || (tool !== "select" && tool !== "pan" && tool !== "eraser")

  return (
    <div className="flex h-svh flex-col">
      <header className="border-border flex h-14 shrink-0 items-center border-b px-4">
        <CollabHeader
          nodeId={nodeId}
          doc={collab.doc!}
          provider={collab.provider!}
          encrypted={collab.encrypted}
          saveState={collab.saveState}
          lastSavedAt={collab.lastSavedAt}
          onSave={() => void collab.save()}
          contentKey={collab.contentKey}
        />
      </header>
      <div className="relative min-h-0 flex-1">
        <Toolbar tool={tool} setTool={setTool} />
        {showPanel ? (
          <PropertiesPanel
            current={current}
            onStyle={onStyle}
            hasSelection={selected !== null}
            onReorder={(dir) => selected && board.reorder(selected.id, dir)}
          />
        ) : null}
        <BoardCanvas
          board={board}
          tool={tool}
          setTool={setTool}
          style={style}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />
      </div>
    </div>
  )
}

const WhiteboardEditor = ({ nodeId }: { nodeId: string }) => (
  <CollabBoundary
    nodeId={nodeId}
    backHref="/whiteboards"
    render={(collab) => <BoardWorkspace nodeId={nodeId} collab={collab} />}
  />
)

export default WhiteboardEditor
