"use client"

import { IconCheck, IconX } from "@tabler/icons-react"
import { BacklinkChips, Chip, RelationChip, RollupValue } from "./Cell"
import type { Property, Row, SelectOption } from "./model"
import { snapshotTitle, useRelationSources } from "./relations"

const ReadValue = ({ property, value }: { property: Property; value: unknown }) => {
  const sources = useRelationSources()
  const options = property.options ?? []
  switch (property.type) {
    case "relation": {
      const ids = Array.isArray(value) ? (value as string[]) : []
      const snapshot = property.targetDb ? sources[property.targetDb] : undefined
      return (
        <span className="flex flex-wrap gap-1">
          {ids.map((id) => (
            <RelationChip key={id} title={snapshotTitle(snapshot, id)} />
          ))}
        </span>
      )
    }
    case "checkbox":
      return value ? (
        <IconCheck className="size-3.5" />
      ) : (
        <IconX className="text-muted-foreground/50 size-3.5" />
      )
    case "select": {
      const option = options.find((candidate) => candidate.id === value)
      return option ? <Chip option={option} /> : null
    }
    case "multiSelect": {
      const ids = Array.isArray(value) ? (value as string[]) : []
      const chosen = ids
        .map((id) => options.find((candidate) => candidate.id === id))
        .filter((candidate): candidate is SelectOption => Boolean(candidate))
      return (
        <span className="flex flex-wrap gap-1">
          {chosen.map((option) => (
            <Chip key={option.id} option={option} />
          ))}
        </span>
      )
    }
    case "url":
      return typeof value === "string" && value ? (
        <span className="text-primary truncate">{value}</span>
      ) : null
    default:
      return value == null || value === "" ? null : <span className="truncate">{String(value)}</span>
  }
}

interface RecordCardProps {
  row: Row
  titleProp: Property | undefined
  fields: Property[]
  /** The full property list, needed to resolve rollups. */
  properties: Property[]
  draggable?: boolean
  onDragStart?: () => void
  onOpen?: () => void
}

/** A read-only summary card for one row, used by the board and gallery views. */
const RecordCard = ({
  row,
  titleProp,
  fields,
  properties,
  draggable,
  onDragStart,
  onOpen,
}: RecordCardProps) => {
  const title = titleProp ? row[titleProp.id] : undefined
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onOpen}
      className="bg-card flex flex-col gap-2 rounded-lg border p-2.5 shadow-sm transition-shadow hover:shadow-md"
      style={{ cursor: draggable ? "grab" : "pointer" }}
    >
      <p className="text-sm font-medium">
        {typeof title === "string" && title ? title : <span className="text-muted-foreground">Untitled</span>}
      </p>
      {fields.map((property) => {
        if (property.type === "rollup") {
          return (
            <div key={property.id} className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground w-20 shrink-0 truncate">{property.name}</span>
              <RollupValue property={property} row={row} properties={properties} />
            </div>
          )
        }
        if (property.type === "relation" && property.reverse) {
          return (
            <div key={property.id} className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground w-20 shrink-0 truncate">{property.name}</span>
              <BacklinkChips property={property} row={row} />
            </div>
          )
        }
        const value = row[property.id]
        const empty =
          value == null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0)
        if (empty && property.type !== "checkbox") return null
        return (
          <div key={property.id} className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground w-20 shrink-0 truncate">{property.name}</span>
            <ReadValue property={property} value={value} />
          </div>
        )
      })}
    </div>
  )
}

export default RecordCard
