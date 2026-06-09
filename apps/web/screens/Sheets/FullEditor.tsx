"use client"

import { useEffect } from "react"
import { applyImportName, takeImport } from "@lib/importFlow"
import type { CollabDocument } from "@lib/useCollabDocument"
import CollabBoundary from "@pages/Collab/CollabBoundary"
import FormulaBar from "@pages/Sheets/components/FormulaBar/FormulaBar"
import ChartsPanel from "@pages/Sheets/components/ChartsPanel/ChartsPanel"
import SheetGrid from "@pages/Sheets/components/SheetGrid/SheetGrid"
import SheetTabs from "@pages/Sheets/components/SheetTabs/SheetTabs"
import SheetToolbar from "@pages/Sheets/components/SheetToolbar/SheetToolbar"
import SheetTopBar from "@pages/Sheets/components/SheetTopBar/SheetTopBar"
import { useSheet } from "@pages/Sheets/useSheet"

const SheetWorkspace = ({ nodeId, collab }: { nodeId: string; collab: CollabDocument }) => {
  const sheet = useSheet(collab.ydoc)

  useEffect(() => {
    const payload = takeImport(nodeId)
    if (!payload || payload.kind !== "sheet") return
    const cells = collab.ydoc.getMap<string>("cells")
    if (cells.size > 0) return
    collab.ydoc.transact(() => {
      for (const [key, value] of Object.entries(payload.cells)) cells.set(key, value)
    })
    applyImportName(nodeId, payload.name, collab.contentKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="bg-background flex h-svh flex-col overflow-hidden">
      <SheetTopBar
        nodeId={nodeId}
        doc={collab.doc!}
        provider={collab.provider!}
        encrypted={collab.encrypted}
        saveState={collab.saveState}
        lastSavedAt={collab.lastSavedAt}
        onSave={() => void collab.save()}
        contentKey={collab.contentKey}
        sheet={sheet}
      />
      <SheetToolbar sheet={sheet} />
      <FormulaBar sheet={sheet} />
      <div className="flex min-h-0 flex-1">
        <SheetGrid sheet={sheet} />
        {sheet.charts.length > 0 ? <ChartsPanel sheet={sheet} /> : null}
      </div>
      <SheetTabs sheet={sheet} />
    </div>
  )
}

/** The fullscreen, Google-style spreadsheet editor (no suite chrome). */
const FullEditor = ({ nodeId }: { nodeId: string }) => (
  <CollabBoundary
    nodeId={nodeId}
    backHref="/sheets"
    render={(collab) => <SheetWorkspace nodeId={nodeId} collab={collab} />}
  />
)

export default FullEditor
