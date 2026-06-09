"use client"

import { useState } from "react"
import { IconArrowsLeftRight, IconCheck, IconPlus } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import {
  colorValue,
  type Property,
  type RollupFn,
  type Row,
  rowTitle,
  type SelectOption,
} from "./model"
import { snapshotTitle, useRelationSources } from "./relations"

const cellInput =
  "h-9 rounded-none border-0 bg-transparent px-2 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"

export const Chip = ({ option }: { option: SelectOption }) => {
  const color = colorValue(option.color)
  return (
    <span
      className="inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {option.name}
    </span>
  )
}

interface CellProps {
  property: Property
  value: unknown
  onChange: (value: unknown) => void
  onAddOption: (name: string) => string | null
  /** The full row and property list — only needed by computed (rollup) cells. */
  row?: Row
  properties?: Property[]
}

const SelectCell = ({
  property,
  value,
  multi,
  onChange,
  onAddOption,
}: CellProps & { multi: boolean }) => {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const options = property.options ?? []
  const selectedIds: string[] = multi
    ? Array.isArray(value)
      ? (value as string[])
      : []
    : value
      ? [value as string]
      : []
  const selected = selectedIds
    .map((id) => options.find((option) => option.id === id))
    .filter((option): option is SelectOption => Boolean(option))
  const filtered = options.filter((option) =>
    option.name.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const exact = options.find(
    (option) => option.name.toLowerCase() === query.trim().toLowerCase(),
  )

  const choose = (id: string) => {
    if (multi) {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((existing) => existing !== id)
        : [...selectedIds, id]
      onChange(next)
    } else {
      onChange(id)
      setOpen(false)
    }
    setQuery("")
  }

  const create = () => {
    const name = query.trim()
    if (!name) return
    const id = onAddOption(name)
    if (id) choose(id)
  }

  return (
    <div className="relative h-9">
      <Button
        variant="ghost"
        className="h-9 w-full justify-start gap-1 rounded-none px-2 font-normal hover:bg-accent/40"
        onClick={() => setOpen((value) => !value)}
      >
        {selected.length > 0 ? (
          <span className="flex flex-wrap items-center gap-1">
            {selected.map((option) => (
              <Chip key={option.id} option={option} />
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">Empty</span>
        )}
      </Button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
          <div className="bg-popover absolute top-full left-0 z-50 mt-1 w-60 rounded-lg border p-1 shadow-lg">
            <Input
              autoFocus
              value={query}
              placeholder="Search or create…"
              className="mb-1 h-8"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  if (exact) choose(exact.id)
                  else create()
                }
              }}
            />
            <div className="max-h-48 overflow-y-auto">
              {filtered.map((option) => (
                <Button
                  key={option.id}
                  variant="ghost"
                  className="h-8 w-full justify-start gap-2 rounded-md px-2 font-normal"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    choose(option.id)
                  }}
                >
                  <Chip option={option} />
                  {selectedIds.includes(option.id) ? (
                    <IconCheck className="ml-auto size-4" />
                  ) : null}
                </Button>
              ))}
              {query.trim() && !exact ? (
                <Button
                  variant="ghost"
                  className="h-8 w-full justify-start gap-2 rounded-md px-2 font-normal"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    create()
                  }}
                >
                  <IconPlus className="size-4" />
                  Create “{query.trim()}”
                </Button>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

export const RelationChip = ({ title }: { title: string }) => (
  <span className="bg-muted inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-xs">
    <IconArrowsLeftRight className="size-3 shrink-0" />
    <span className="truncate">{title}</span>
  </span>
)

const RelationCell = ({ property, value, onChange }: Omit<CellProps, "onAddOption">) => {
  const sources = useRelationSources()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  if (!property.targetDb) {
    return (
      <div className="text-muted-foreground flex h-9 items-center px-2 text-sm">
        Set a linked database
      </div>
    )
  }

  const snapshot = sources[property.targetDb]
  const rows = snapshot?.rows ?? []
  const selectedIds = Array.isArray(value) ? (value as string[]) : []
  const titleOf = (id: string) => snapshotTitle(snapshot, id)
  const filtered = rows.filter((row) =>
    rowTitle(snapshot?.properties ?? [], row)
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((existing) => existing !== id)
        : [...selectedIds, id],
    )
  }

  return (
    <div className="relative h-9">
      <Button
        variant="ghost"
        className="h-9 w-full justify-start gap-1 rounded-none px-2 font-normal hover:bg-accent/40"
        onClick={() => setOpen((value) => !value)}
      >
        {selectedIds.length > 0 ? (
          <span className="flex flex-wrap items-center gap-1">
            {selectedIds.map((id) => (
              <RelationChip key={id} title={titleOf(id)} />
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm">Empty</span>
        )}
      </Button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onMouseDown={() => setOpen(false)} />
          <div className="bg-popover absolute top-full left-0 z-50 mt-1 w-64 rounded-lg border p-1 shadow-lg">
            <Input
              autoFocus
              value={query}
              placeholder="Search rows…"
              className="mb-1 h-8"
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="max-h-48 overflow-y-auto">
              {snapshot?.status === "loading" ? (
                <p className="text-muted-foreground px-2 py-1.5 text-sm">Loading…</p>
              ) : null}
              {snapshot?.status === "locked" ? (
                <p className="text-muted-foreground px-2 py-1.5 text-sm">Linked database is locked.</p>
              ) : null}
              {filtered.map((row) => (
                <Button
                  key={row.id}
                  variant="ghost"
                  className="h-8 w-full justify-start gap-2 rounded-md px-2 font-normal"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    toggle(row.id)
                  }}
                >
                  <span className="truncate">{rowTitle(snapshot?.properties ?? [], row)}</span>
                  {selectedIds.includes(row.id) ? <IconCheck className="ml-auto size-4" /> : null}
                </Button>
              ))}
              {snapshot?.status === "ready" && filtered.length === 0 ? (
                <p className="text-muted-foreground px-2 py-1.5 text-sm">No rows.</p>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

const resolveValue = (property: Property | undefined, value: unknown): string => {
  if (!property) return value == null ? "" : String(value)
  if (property.type === "select")
    return property.options?.find((option) => option.id === value)?.name ?? ""
  if (property.type === "multiSelect") {
    const ids = Array.isArray(value) ? (value as string[]) : []
    return ids
      .map((id) => property.options?.find((option) => option.id === id)?.name)
      .filter(Boolean)
      .join(", ")
  }
  if (property.type === "checkbox") return value ? "Yes" : "No"
  return value == null || value === "" ? "" : String(value)
}

const rollupDisplay = (
  fn: RollupFn,
  linkedIds: string[],
  rowsById: Map<string, Row>,
  targetProp: Property | undefined,
): string => {
  const values = linkedIds
    .map((id) => rowsById.get(id))
    .filter((row): row is Row => Boolean(row))
    .map((row) => (targetProp ? row[targetProp.id] : undefined))
  const numbers = values.map((value) => Number(value)).filter((n) => Number.isFinite(n))
  const sum = numbers.reduce((total, n) => total + n, 0)
  const checked = values.filter(Boolean).length
  switch (fn) {
    case "count":
      return String(linkedIds.length)
    case "values":
      return values.map((value) => resolveValue(targetProp, value)).filter(Boolean).join(", ")
    case "sum":
      return String(sum)
    case "average":
      return numbers.length ? String(Math.round((sum / numbers.length) * 100) / 100) : "0"
    case "min":
      return numbers.length ? String(Math.min(...numbers)) : "—"
    case "max":
      return numbers.length ? String(Math.max(...numbers)) : "—"
    case "checked":
      return String(checked)
    case "percentChecked":
      return values.length ? `${Math.round((checked / values.length) * 100)}%` : "0%"
    default:
      return ""
  }
}

export const RollupValue = ({
  property,
  row,
  properties,
}: {
  property: Property
  row?: Row
  properties?: Property[]
}) => {
  const sources = useRelationSources()
  const relationProp = (properties ?? []).find(
    (candidate) => candidate.id === property.relationProp && candidate.type === "relation",
  )
  if (!relationProp?.targetDb || !property.rollupProp || !property.rollup) {
    return <span className="text-muted-foreground">Configure rollup</span>
  }
  const linkedIds =
    row && Array.isArray(row[relationProp.id]) ? (row[relationProp.id] as string[]) : []
  const snapshot = sources[relationProp.targetDb]
  if (snapshot?.status === "loading") return <span className="text-muted-foreground">…</span>
  const rowsById = new Map((snapshot?.rows ?? []).map((target) => [target.id, target]))
  const targetProp = snapshot?.properties.find((candidate) => candidate.id === property.rollupProp)
  return <span className="truncate">{rollupDisplay(property.rollup, linkedIds, rowsById, targetProp)}</span>
}

const RollupCell = (props: { property: Property; row?: Row; properties?: Property[] }) => (
  <div className="flex h-9 items-center px-2 text-sm">
    <RollupValue {...props} />
  </div>
)

/** Renders and edits one database cell according to its property type. */
export const Cell = ({ property, value, onChange, onAddOption, row, properties }: CellProps) => {
  switch (property.type) {
    case "checkbox":
      return (
        <div className="flex h-9 items-center px-2.5">
          <Checkbox checked={Boolean(value)} onCheckedChange={(checked) => onChange(Boolean(checked))} />
        </div>
      )
    case "number":
      return (
        <Input
          type="number"
          value={value === null || value === undefined || value === "" ? "" : String(value)}
          className={cellInput}
          onChange={(event) =>
            onChange(event.target.value === "" ? "" : Number(event.target.value))
          }
        />
      )
    case "date":
      return (
        <Input
          type="date"
          value={typeof value === "string" ? value : ""}
          className={cellInput}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    case "url":
      return (
        <Input
          type="url"
          value={typeof value === "string" ? value : ""}
          className={cellInput}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    case "select":
      return (
        <SelectCell
          property={property}
          value={value}
          multi={false}
          onChange={onChange}
          onAddOption={onAddOption}
        />
      )
    case "multiSelect":
      return (
        <SelectCell
          property={property}
          value={value}
          multi
          onChange={onChange}
          onAddOption={onAddOption}
        />
      )
    case "relation":
      return <RelationCell property={property} value={value} onChange={onChange} />
    case "rollup":
      return <RollupCell property={property} row={row} properties={properties} />
    default:
      return (
        <Input
          value={typeof value === "string" ? value : value == null ? "" : String(value)}
          className={cellInput}
          onChange={(event) => onChange(event.target.value)}
        />
      )
  }
}
