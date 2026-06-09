"use client"

import { useState } from "react"
import {
  IconCalendar,
  IconCheckbox,
  IconChevronDown,
  IconHash,
  IconLetterT,
  IconLink,
  IconList,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react"
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
import { PROP_LABELS, type Property, type PropType } from "./model"
import type { DatabaseState } from "./useDatabase"

const PROP_TYPES: PropType[] = ["text", "number", "select", "multiSelect", "checkbox", "date", "url"]

const PropertyIcon = ({ type, className }: { type: PropType; className?: string }) => {
  switch (type) {
    case "number":
      return <IconHash className={className} />
    case "select":
      return <IconChevronDown className={className} />
    case "multiSelect":
      return <IconList className={className} />
    case "checkbox":
      return <IconCheckbox className={className} />
    case "date":
      return <IconCalendar className={className} />
    case "url":
      return <IconLink className={className} />
    default:
      return <IconLetterT className={className} />
  }
}

const colWidth = (index: number): number => (index === 0 ? 240 : 180)

const TableView = ({ db }: { db: DatabaseState }) => {
  const { properties, rows } = db
  const [editing, setEditing] = useState<string | null>(null)

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
              className="text-muted-foreground size-7 opacity-0 group-hover:opacity-100"
              onClick={() => db.deleteRow(row.id)}
            >
              <IconTrash className="size-3.5" />
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
              />
            </div>
          ))}
          <div className="border-border w-11 shrink-0 border-l" />
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
