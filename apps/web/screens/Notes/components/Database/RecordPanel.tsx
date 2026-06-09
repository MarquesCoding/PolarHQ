"use client"

import type { CollabDocument } from "@lib/useCollabDocument"
import { Dialog, DialogContent, DialogTitle } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import BlockEditor from "@pages/Notes/components/BlockEditor/BlockEditor"
import { Cell } from "./Cell"
import type { Row } from "./model"
import { PropertyIcon } from "./PropertyIcon"
import type { DatabaseState } from "./useDatabase"

interface RecordPanelProps {
  collab: CollabDocument
  db: DatabaseState
  row: Row
  onClose: () => void
}

/** A database row opened as a full page: its title, every property, and its own block content. */
const RecordPanel = ({ collab, db, row, onClose }: RecordPanelProps) => {
  const titleProp = db.properties[0]
  const fields = db.properties.filter((property) => property.id !== titleProp?.id)
  const title =
    titleProp && typeof row[titleProp.id] === "string" ? (row[titleProp.id] as string) : ""

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Record</DialogTitle>
        <div className="scrollbar-slim flex-1 overflow-y-auto px-10 py-9">
          {titleProp ? (
            <Input
              value={title}
              placeholder="Untitled"
              className="mb-5 h-auto rounded-none border-0 px-0 text-3xl font-bold shadow-none focus-visible:ring-0"
              onChange={(event) => db.setCell(row.id, titleProp.id, event.target.value)}
            />
          ) : null}

          <div className="mb-6 flex flex-col gap-1.5">
            {fields.map((property) => (
              <div key={property.id} className="flex items-start gap-3">
                <div className="text-muted-foreground flex w-40 shrink-0 items-center gap-1.5 py-1.5 text-sm">
                  <PropertyIcon type={property.type} className="size-3.5" />
                  <span className="truncate">{property.name}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <Cell
                    property={property}
                    value={row[property.id]}
                    onChange={(value) => db.setCell(row.id, property.id, value)}
                    onAddOption={(name) => db.addOption(property.id, name)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="border-border border-t pt-5">
            <BlockEditor
              ydoc={collab.ydoc}
              provider={collab.provider!}
              field={`db:row:${row.id}`}
              className="min-h-[30vh]"
              placeholder="Add notes, press ‘/’ for commands…"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default RecordPanel
