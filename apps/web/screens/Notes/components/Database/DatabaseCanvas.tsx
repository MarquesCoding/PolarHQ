"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import type { CollabDocument } from "@lib/useCollabDocument"
import {
  IconArrowsSort,
  IconChevronDown,
  IconFilter,
  IconLayoutGrid,
  IconLayoutKanban,
  IconPlus,
  IconTable,
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
import { cn } from "@workspace/ui/lib/utils"
import BoardView from "./BoardView"
import GalleryView from "./GalleryView"
import type { ViewType } from "./model"
import RecordPanel from "./RecordPanel"
import { RelationProvider } from "./relations"
import TableView from "./TableView"
import { useDatabase } from "./useDatabase"
import { FilterBar, SortBar } from "./ViewFilters"

const VIEW_ICON: Record<ViewType, (props: { className?: string }) => ReactNode> = {
  table: (p) => <IconTable {...p} />,
  board: (p) => <IconLayoutKanban {...p} />,
  gallery: (p) => <IconLayoutGrid {...p} />,
}

/** A full-page Notion-style database: typed properties, rows, and table/board/gallery views. */
const DatabaseCanvas = ({ collab }: { collab: CollabDocument }) => {
  const db = useDatabase(collab.ydoc)
  const { views, properties } = db
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [openRowId, setOpenRowId] = useState<string | null>(null)
  const [panel, setPanel] = useState<"filter" | "sort" | null>(null)
  const openRow = db.rows.find((row) => row.id === openRowId)

  if (views.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
        Setting up…
      </div>
    )
  }

  const active = views.find((view) => view.id === activeId) ?? views[0]!
  const selectProps = properties.filter((property) => property.type === "select")
  const filterCount = active.filters?.length ?? 0
  const sortCount = active.sorts?.length ?? 0
  const relationTargets = [
    ...new Set(
      properties
        .filter((property) => property.type === "relation" && property.targetDb)
        .map((property) => property.targetDb as string),
    ),
  ]

  const addView = (type: ViewType) => {
    const groupBy = type === "table" ? undefined : selectProps[0]?.id
    setActiveId(db.addView(type, groupBy))
  }

  return (
    <RelationProvider targetIds={relationTargets}>
      <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-border flex items-center gap-1 border-b px-3">
        {views.map((view) => {
          const ViewIcon = VIEW_ICON[view.type]
          if (editing === view.id) {
            return (
              <Input
                key={view.id}
                autoFocus
                defaultValue={view.name}
                className="my-1 h-7 w-32"
                onBlur={(event) => {
                  db.updateView(view.id, { name: event.target.value.trim() || view.name })
                  setEditing(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur()
                  if (event.key === "Escape") setEditing(null)
                }}
              />
            )
          }
          return (
            <Button
              key={view.id}
              variant="ghost"
              size="sm"
              className={cn(
                "gap-1.5 rounded-none border-b-2 border-transparent font-normal",
                view.id === active.id
                  ? "border-foreground text-foreground"
                  : "text-muted-foreground",
              )}
              onClick={() => setActiveId(view.id)}
              onDoubleClick={() => setEditing(view.id)}
            >
              <ViewIcon className="size-3.5" />
              {view.name}
            </Button>
          )
        })}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="text-muted-foreground size-7">
                <IconPlus className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => addView("table")}>
              <IconTable className="size-3.5" />
              Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addView("board")}>
              <IconLayoutKanban className="size-3.5" />
              Board
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addView("gallery")}>
              <IconLayoutGrid className="size-3.5" />
              Gallery
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        <Button
          variant={panel === "filter" ? "secondary" : "ghost"}
          size="sm"
          className="text-muted-foreground gap-1.5"
          onClick={() => setPanel((current) => (current === "filter" ? null : "filter"))}
        >
          <IconFilter className="size-3.5" />
          Filter{filterCount > 0 ? ` · ${filterCount}` : ""}
        </Button>
        <Button
          variant={panel === "sort" ? "secondary" : "ghost"}
          size="sm"
          className="text-muted-foreground gap-1.5"
          onClick={() => setPanel((current) => (current === "sort" ? null : "sort"))}
        >
          <IconArrowsSort className="size-3.5" />
          Sort{sortCount > 0 ? ` · ${sortCount}` : ""}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="text-muted-foreground size-7">
                <IconChevronDown className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {active.type !== "table" ? (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Group by</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {selectProps.length > 0 ? (
                    selectProps.map((property) => (
                      <DropdownMenuItem
                        key={property.id}
                        onClick={() => db.updateView(active.id, { groupBy: property.id })}
                      >
                        {property.name}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>No Select property</DropdownMenuItem>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            ) : null}
            <DropdownMenuItem onClick={() => setEditing(active.id)}>Rename view</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={views.length <= 1}
              onClick={() => {
                db.deleteView(active.id)
                setActiveId(null)
              }}
            >
              <IconTrash className="size-3.5" />
              Delete view
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {panel === "filter" ? <FilterBar db={db} view={active} /> : null}
      {panel === "sort" ? <SortBar db={db} view={active} /> : null}

      <div className="scrollbar-slim min-h-0 flex-1 overflow-auto">
        {active.type === "table" ? (
          <TableView db={db} view={active} onOpenRow={setOpenRowId} />
        ) : active.type === "board" ? (
          <BoardView db={db} view={active} onOpenRow={setOpenRowId} />
        ) : (
          <GalleryView db={db} view={active} onOpenRow={setOpenRowId} />
        )}
      </div>

      {openRow ? (
        <RecordPanel
          key={openRow.id}
          collab={collab}
          db={db}
          row={openRow}
          onClose={() => setOpenRowId(null)}
        />
      ) : null}
      </div>
    </RelationProvider>
  )
}

export default DatabaseCanvas
