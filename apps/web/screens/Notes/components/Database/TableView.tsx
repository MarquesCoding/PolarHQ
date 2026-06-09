"use client"

import { useState } from "react"
import { fetchDocs } from "@lib/docs"
import { IconArrowsDiagonal, IconCheck, IconDots, IconPlus, IconTrash } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Cell } from "./Cell"
import {
  applyView,
  PROP_LABELS,
  type Property,
  type PropType,
  ROLLUP_LABELS,
  type RollupFn,
  type ViewDef,
} from "./model"
import { PropertyIcon } from "./PropertyIcon"
import { type DbSnapshot, useRelationSources } from "./relations"
import type { DatabaseState } from "./useDatabase"

const ROLLUP_FNS: RollupFn[] = [
  "count",
  "values",
  "sum",
  "average",
  "min",
  "max",
  "checked",
  "percentChecked",
]

const PROP_TYPES: PropType[] = [
  "text",
  "number",
  "select",
  "multiSelect",
  "checkbox",
  "date",
  "url",
  "relation",
  "rollup",
]

const colWidth = (index: number): number => (index === 0 ? 240 : 180)

const RollupConfig = ({
  db,
  property,
  sources,
}: {
  db: DatabaseState
  property: Property
  sources: Record<string, DbSnapshot>
}) => {
  const relationProps = db.properties.filter((p) => p.type === "relation" && p.targetDb)
  const linked = db.properties.find((p) => p.id === property.relationProp && p.type === "relation")
  const targetProps = linked?.targetDb ? (sources[linked.targetDb]?.properties ?? []) : []
  return (
    <>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Relation</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {relationProps.length > 0 ? (
            relationProps.map((rp) => (
              <DropdownMenuItem
                key={rp.id}
                onClick={() => db.setRollup(property.id, { relationProp: rp.id })}
              >
                <span className="truncate">{rp.name}</span>
                {rp.id === property.relationProp ? <IconCheck className="ml-auto size-3.5" /> : null}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>Add a relation first</DropdownMenuItem>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Property</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {targetProps.length > 0 ? (
            targetProps.map((tp) => (
              <DropdownMenuItem
                key={tp.id}
                onClick={() => db.setRollup(property.id, { rollupProp: tp.id })}
              >
                <span className="truncate">{tp.name}</span>
                {tp.id === property.rollupProp ? <IconCheck className="ml-auto size-3.5" /> : null}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled>Pick a relation first</DropdownMenuItem>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Calculate</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {ROLLUP_FNS.map((fn) => (
            <DropdownMenuItem key={fn} onClick={() => db.setRollup(property.id, { rollup: fn })}>
              <span className="truncate">{ROLLUP_LABELS[fn]}</span>
              {fn === property.rollup ? <IconCheck className="ml-auto size-3.5" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  )
}

const TableView = ({
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
  const sources = useRelationSources()
  const [editing, setEditing] = useState<string | null>(null)
  const { data: dbList } = useQuery({
    queryKey: ["docs", "database"],
    queryFn: () => fetchDocs("database"),
  })
  const databases = [...(dbList?.documents ?? []), ...(dbList?.shared ?? [])]

  const header = (property: Property, index: number) => (
    <div
      key={property.id}
      style={{ width: colWidth(index) }}
      className="border-border shrink-0 border-l"
    >
      {editing === property.id ? (
        <Input
          autoFocus
          defaultValue={property.name}
          className="h-9 rounded-none border-0 px-2 text-sm font-medium shadow-none focus-visible:ring-0"
          onBlur={(event) => {
            db.renameProperty(property.id, event.target.value.trim() || property.name)
            setEditing(null)
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur()
            if (event.key === "Escape") setEditing(null)
          }}
        />
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                className="text-muted-foreground h-9 w-full justify-start gap-1.5 rounded-none px-2 font-medium"
              >
                <PropertyIcon type={property.type} className="size-3.5" />
                <span className="truncate">{property.name}</span>
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setEditing(property.id)}>Rename</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Type · {PROP_LABELS[property.type]}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {PROP_TYPES.map((type) => (
                  <DropdownMenuItem key={type} onClick={() => db.retypeProperty(property.id, type)}>
                    <PropertyIcon type={type} className="size-3.5" />
                    {PROP_LABELS[type]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            {property.type === "relation" ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Linked database</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {databases.length > 0 ? (
                    databases.map((database) => (
                      <DropdownMenuItem
                        key={database.id}
                        onClick={() => db.setRelationTarget(property.id, database.id)}
                      >
                        <span className="truncate">{database.name}</span>
                        {database.id === property.targetDb ? (
                          <IconCheck className="ml-auto size-3.5" />
                        ) : null}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>No databases</DropdownMenuItem>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : null}
            {property.type === "rollup" ? <RollupConfig db={db} property={property} sources={sources} /> : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => db.deleteProperty(property.id)}>
              <IconTrash className="size-3.5" />
              Delete property
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )

  return (
    <div className="min-w-max text-sm">
      <div className="border-border bg-muted/30 flex border-y">
        <div className="w-8 shrink-0" />
        {properties.map(header)}
        <div className="border-border w-11 shrink-0 border-l">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="text-muted-foreground h-9 w-full rounded-none px-0"
                >
                  <IconPlus className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {PROP_TYPES.map((type) => (
                <DropdownMenuItem key={type} onClick={() => db.addProperty(type)}>
                  <PropertyIcon type={type} className="size-3.5" />
                  {PROP_LABELS[type]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {rows.map((row) => (
        <div key={row.id} className="border-border hover:bg-accent/10 group flex border-b">
          <div className="flex w-8 shrink-0 items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              title="Open"
              className="text-muted-foreground size-7 opacity-0 group-hover:opacity-100"
              onClick={() => onOpenRow(row.id)}
            >
              <IconArrowsDiagonal className="size-3.5" />
            </Button>
          </div>
          {properties.map((property, index) => (
            <div
              key={property.id}
              style={{ width: colWidth(index) }}
              className="border-border shrink-0 border-l"
            >
              <Cell
                property={property}
                value={row[property.id]}
                onChange={(value) => db.setCell(row.id, property.id, value)}
                onAddOption={(name) => db.addOption(property.id, name)}
                row={row}
                properties={properties}
              />
            </div>
          ))}
          <div className="border-border flex w-11 shrink-0 items-center justify-center border-l">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground size-7 opacity-0 group-hover:opacity-100"
                  >
                    <IconDots className="size-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onOpenRow(row.id)}>
                  <IconArrowsDiagonal className="size-3.5" />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => db.deleteRow(row.id)}>
                  <IconTrash className="size-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}

      <div className="border-border flex border-b">
        <Button
          variant="ghost"
          className="text-muted-foreground h-9 justify-start gap-1.5 rounded-none px-3 font-normal"
          onClick={() => db.addRow()}
        >
          <IconPlus className="size-4" />
          New
        </Button>
      </div>
    </div>
  )
}

export default TableView
