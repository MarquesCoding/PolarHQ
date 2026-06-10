"use client"

import { type MouseEvent, useEffect, useRef, useState } from "react"
import type { DriveNode } from "@lib/drive"
import { formatBytes } from "@lib/format"
import { Icon } from "@lib/icons"
import type { SelectionApi } from "@lib/selection"
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react"
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { cn } from "@workspace/ui/lib/utils"
import { DRIVE_NODES_MIME } from "@pages/Drive/components/NodeCard/NodeCard"
import NodeContextMenu, {
  type DriveNodeActions,
} from "@pages/Drive/components/NodeContextMenu/NodeContextMenu"

interface NodeTableProps {
  nodes: DriveNode[]
  selection: SelectionApi
  onOpen: (node: DriveNode) => void
  onDropNodes?: (folder: DriveNode, ids: string[]) => void
  onSpringInto?: (folder: DriveNode) => void
  onParentOpen?: () => void
  onParentDrop?: (ids: string[]) => void
  actions?: DriveNodeActions
}

const iconFor = (node: DriveNode): string => {
  if (node.kind === "folder")
    return node.special ? "folder-shield" : node.locked ? "folder-key" : "folder"
  const name = node.name.toLowerCase()
  const mime = node.mimeType ?? ""
  if (mime === "application/vnd.orbit.doc") return "document"
  if (mime === "application/vnd.orbit.sheet") return "table"
  if (/\.(xlsx|xls|csv|tsv|ods)$/i.test(name)) return "table"
  if (/\.docx$/i.test(name)) return "document"
  if (/\.pptx$/i.test(name)) return "presentation"
  if (mime.startsWith("audio/")) return "music"
  if (mime.startsWith("video/")) return "video"
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "file-pdf"
  if (/\.(zip|tar|gz|tgz|rar|7z|bz2|xz|dmg)$/i.test(name)) return "file-zip"
  if (/\.(db|sqlite|sqlite3|sql)$/i.test(name)) return "database"
  if (mime.startsWith("image/")) return "photo"
  return "file-text"
}

const columns: ColumnDef<DriveNode>[] = [
  { id: "name", header: "Name", accessorFn: (node) => node.name.toLowerCase() },
  { id: "size", header: "Size", accessorFn: (node) => node.sizeBytes ?? 0 },
  { id: "modified", header: "Modified", accessorFn: (node) => new Date(node.updatedAt).getTime() },
]

const COLS = "grid grid-cols-[1.5rem_1fr_7rem_11rem] items-center gap-2"

const NodeTable = ({
  nodes,
  selection,
  onOpen,
  onDropNodes,
  onSpringInto,
  onParentOpen,
  onParentDrop,
  actions,
}: NodeTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([])
  const [over, setOver] = useState<string | null>(null)
  const [parentOver, setParentOver] = useState(false)
  const [parentBlink, setParentBlink] = useState(false)
  const [springId, setSpringId] = useState<string | null>(null)
  const springTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearSpring = () => {
    clearTimeout(springTimer.current)
    springTimer.current = undefined
    setSpringId(null)
    setParentBlink(false)
  }
  const parentReady = useRef(false)
  useEffect(() => {
    const timer = setTimeout(() => {
      parentReady.current = true
    }, 300)
    return () => {
      clearTimeout(timer)
      clearTimeout(springTimer.current)
    }
  }, [])
  const openParent = () => {
    if (parentReady.current) onParentOpen?.()
  }

  const table = useReactTable({
    data: nodes,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rows = table.getRowModel().rows
  const ordered = rows.map((row) => row.original.id)

  const select = (node: DriveNode, shiftKey: boolean, additive: boolean) => {
    if (shiftKey) selection.rangeTo(node.id, ordered)
    else if (additive) selection.toggle(node.id, ordered)
    else selection.selectOnly(node.id)
  }
  const dragIdsFor = (node: DriveNode): string[] =>
    selection.isSelected(node.id) && selection.count > 0 ? [...selection.selected] : [node.id]

  const allSelected = ordered.length > 0 && ordered.every((id) => selection.isSelected(id))
  const someSelected = ordered.some((id) => selection.isSelected(id))

  return (
    <div className="flex flex-col">
      <div className={cn(COLS, "text-muted-foreground border-border/60 border-b px-2 pb-1.5 text-xs")}>
        <Checkbox
          aria-label="Select all"
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onCheckedChange={() => (allSelected ? selection.clear() : selection.selectAll(ordered))}
        />
        {table.getHeaderGroups()[0]!.headers.map((header) => {
          const sorted = header.column.getIsSorted()
          return (
            <button
              key={header.id}
              type="button"
              onClick={header.column.getToggleSortingHandler()}
              className="flex items-center gap-1 font-medium"
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              {sorted === "asc" ? (
                <IconChevronUp className="size-3" />
              ) : sorted === "desc" ? (
                <IconChevronDown className="size-3" />
              ) : null}
            </button>
          )
        })}
      </div>

      {onParentOpen ? (
        <div
          onDoubleClick={openParent}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes(DRIVE_NODES_MIME)) return
            event.preventDefault()
            setParentOver(true)
            if (onParentOpen && !springTimer.current) {
              springTimer.current = setTimeout(() => {
                setParentBlink(true)
                springTimer.current = setTimeout(() => onParentOpen(), 350)
              }, 1300)
            }
          }}
          onDragLeave={() => {
            setParentOver(false)
            clearSpring()
          }}
          onDrop={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setParentOver(false)
            clearSpring()
            const raw = event.dataTransfer.getData(DRIVE_NODES_MIME)
            if (!raw) return
            const ids = JSON.parse(raw) as string[]
            if (ids.length > 0) onParentDrop?.(ids)
          }}
          className={cn(
            COLS,
            "group cursor-pointer rounded-md px-2 py-1.5 text-sm transition hover:bg-sidebar-accent/50",
            parentOver && "ring-primary ring-1",
            parentBlink && "ring-primary animate-pulse ring-2",
          )}
        >
          <span />
          <div className="flex min-w-0 items-center gap-2">
            <Icon name="folder-open" className="text-muted-foreground size-4 shrink-0" />
            <span className="truncate">..</span>
          </div>
          <span className="text-muted-foreground">—</span>
          <span className="text-muted-foreground">—</span>
        </div>
      ) : null}

      {rows.map((row) => {
        const node = row.original
        const isFolder = node.kind === "folder"
        const canDrop = isFolder && Boolean(onDropNodes)
        const selected = selection.isSelected(node.id)

        const element = (
          <div
            draggable={!node.special}
            onDragStart={(event) => {
              event.dataTransfer.setData(DRIVE_NODES_MIME, JSON.stringify(dragIdsFor(node)))
              event.dataTransfer.effectAllowed = "move"
            }}
            onDragOver={
              canDrop
                ? (event) => {
                    if (!event.dataTransfer.types.includes(DRIVE_NODES_MIME)) return
                    event.preventDefault()
                    setOver(node.id)
                    if (onSpringInto && !springTimer.current) {
                      springTimer.current = setTimeout(() => {
                        setSpringId(node.id)
                        springTimer.current = setTimeout(() => onSpringInto(node), 350)
                      }, 1300)
                    }
                  }
                : undefined
            }
            onDragLeave={
              canDrop
                ? () => {
                    setOver((id) => (id === node.id ? null : id))
                    clearSpring()
                  }
                : undefined
            }
            onDrop={
              canDrop
                ? (event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    setOver(null)
                    clearSpring()
                    const raw = event.dataTransfer.getData(DRIVE_NODES_MIME)
                    if (!raw) return
                    const ids = (JSON.parse(raw) as string[]).filter((id) => id !== node.id)
                    if (ids.length > 0) onDropNodes!(node, ids)
                  }
                : undefined
            }
            onClick={(event: MouseEvent) =>
              select(node, event.shiftKey, event.metaKey || event.ctrlKey)
            }
            onDoubleClick={() => onOpen(node)}
            className={cn(
              COLS,
              "group cursor-pointer rounded-md px-2 py-1.5 text-sm transition",
              selected ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50",
              over === node.id && "ring-primary ring-1",
              springId === node.id && "ring-primary animate-pulse ring-2",
            )}
          >
            <Checkbox
              aria-label={selected ? "Deselect" : "Select"}
              checked={selected}
              onCheckedChange={() => selection.toggle(node.id, ordered)}
              onClick={(event) => event.stopPropagation()}
            />
            <div className="flex min-w-0 items-center gap-2">
              <Icon
                name={iconFor(node)}
                className={cn("size-4 shrink-0", isFolder ? "text-blue-400" : "text-muted-foreground")}
              />
              <span className="truncate">{node.name}</span>
            </div>
            <span className="text-muted-foreground tabular-nums">
              {isFolder ? "—" : formatBytes(node.sizeBytes ?? 0)}
            </span>
            <span className="text-muted-foreground">
              {new Date(node.updatedAt).toLocaleDateString()}
            </span>
          </div>
        )

        return actions ? (
          <NodeContextMenu key={node.id} node={node} actions={actions}>
            {element}
          </NodeContextMenu>
        ) : (
          <div key={node.id}>{element}</div>
        )
      })}
    </div>
  )
}

export default NodeTable
