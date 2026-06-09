"use client"

import { IconPlus } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import RecordCard from "./RecordCard"
import type { DatabaseState } from "./useDatabase"

const GalleryView = ({ db }: { db: DatabaseState }) => {
  const { properties, rows } = db
  const titleProp = properties[0]
  const fields = properties.filter((property) => property.id !== titleProp?.id).slice(0, 4)

  return (
    <div
      className="grid gap-3 p-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
    >
      {rows.map((row) => (
        <RecordCard key={row.id} row={row} titleProp={titleProp} fields={fields} />
      ))}
      <Button
        variant="outline"
        className="text-muted-foreground h-full min-h-24 justify-center gap-1.5"
        onClick={() => db.addRow()}
      >
        <IconPlus className="size-4" />
        New
      </Button>
    </div>
  )
}

export default GalleryView
