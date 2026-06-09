"use client"

import { useState } from "react"
import { IconPlus } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { applyView, colorValue, type ViewDef } from "./model"
import RecordCard from "./RecordCard"
import type { DatabaseState } from "./useDatabase"

const BoardView = ({
  db,
  view,
  onOpenRow,
}: {
  db: DatabaseState
  view: ViewDef
  onOpenRow: (rowId: string) => void
}) => {
  const { properties } = db
  const rows = applyView(db.rows, db.properties, view)
  const selectProps = properties.filter((property) => property.type === "select")
  const groupProp =
    properties.find((property) => property.id === view.groupBy && property.type === "select") ??
    selectProps[0]
  const [dragId, setDragId] = useState<string | null>(null)

  if (!groupProp) {
    return (
      <div className="text-muted-foreground p-8 text-sm">
        Add a <span className="text-foreground font-medium">Select</span> property to group cards
        into a board.
      </div>
    )
  }

  const titleProp = properties[0]
  const fields = properties.filter(
    (property) => property.id !== groupProp.id && property.id !== titleProp?.id,
  )
  const columns = [
    { id: "", name: `No ${groupProp.name}`, color: "gray" },
    ...(groupProp.options ?? []),
  ]
  const rowsFor = (optionId: string) =>
    rows.filter((row) => (row[groupProp.id] ?? "") === optionId)

  return (
    <div className="flex gap-3 p-4">
      {columns.map((column) => {
        const columnRows = rowsFor(column.id)
        return (
          <div
            key={column.id || "none"}
            className="w-64 shrink-0"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragId) db.setCell(dragId, groupProp.id, column.id)
              setDragId(null)
            }}
          >
            <div className="mb-2 flex items-center gap-2 px-1">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: colorValue(column.color) }}
              />
              <span className="text-sm font-medium">{column.name}</span>
              <span className="text-muted-foreground text-xs">{columnRows.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {columnRows.map((row) => (
                <RecordCard
                  key={row.id}
                  row={row}
                  titleProp={titleProp}
                  fields={fields}
                  properties={properties}
                  draggable
                  onDragStart={() => setDragId(row.id)}
                  onOpen={() => onOpenRow(row.id)}
                />
              ))}
              <Button
                variant="ghost"
                className="text-muted-foreground justify-start gap-1.5 font-normal"
                onClick={() => db.addRow(column.id ? { [groupProp.id]: column.id } : undefined)}
              >
                <IconPlus className="size-4" />
                New
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default BoardView
