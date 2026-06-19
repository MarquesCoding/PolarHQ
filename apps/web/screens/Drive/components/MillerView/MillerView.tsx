"use client"

import { useEffect, useState } from "react"
import { type DriveNode, fetchNodes } from "@workspace/core/drive"
import { Icon } from "@lib/icons"
import type { SelectionApi } from "@lib/selection"
import { CaretRight } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "react-i18next"
import Spinner from "@components/Spinner/Spinner"
import NodeContextMenu, {
  type DriveNodeActions,
} from "@pages/Drive/components/NodeContextMenu/NodeContextMenu"
import { iconFor } from "@pages/Drive/components/NodeTable/NodeTable"

const sortNodes = (nodes: DriveNode[]): DriveNode[] =>
  [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1
    const rank = (node: DriveNode) => (node.special ? 0 : node.locked ? 1 : 2)
    if (rank(a) !== rank(b)) return rank(a) - rank(b)
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  })

interface MillerColumnProps {
  folderId?: string
  activeId?: string
  selection: SelectionApi
  onPick: (node: DriveNode) => void
  onOpen: (node: DriveNode) => void
  actions: DriveNodeActions
}

/** One pane of the Miller browser: the children of a single folder. */
const MillerColumn = ({
  folderId,
  activeId,
  selection,
  onPick,
  onOpen,
  actions,
}: MillerColumnProps) => {
  const { t } = useTranslation("drive")
  const { data, isLoading } = useQuery({
    queryKey: ["drive", "nodes", folderId ?? "root"],
    queryFn: () => fetchNodes(folderId),
  })
  const nodes = sortNodes(data?.children ?? [])

  return (
    <div className="border-border/60 flex w-60 shrink-0 flex-col border-r">
      <div className="scrollbar-slim flex-1 overflow-y-auto p-1.5">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Spinner className="size-4" />
          </div>
        ) : nodes.length === 0 ? (
          <p className="text-muted-foreground px-2 py-3 text-xs">{t("millerView.empty")}</p>
        ) : (
          nodes.map((node) => {
            const active = node.id === activeId || selection.isSelected(node.id)
            return (
              <NodeContextMenu key={node.id} node={node} actions={actions}>
                <button
                  type="button"
                  onClick={() => onPick(node)}
                  onDoubleClick={() => onOpen(node)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                    active ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50",
                  )}
                >
                  <Icon
                    name={iconFor(node)}
                    className={cn(
                      "size-4 shrink-0",
                      node.kind === "folder" ? "text-blue-400" : "text-muted-foreground",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{node.name}</span>
                  {node.kind === "folder" ? (
                    <CaretRight className="text-muted-foreground size-3.5 shrink-0" />
                  ) : null}
                </button>
              </NodeContextMenu>
            )
          })
        )}
      </div>
    </div>
  )
}

interface MillerViewProps {
  rootFolderId?: string
  selection: SelectionApi
  onOpen: (node: DriveNode) => void
  actions: DriveNodeActions
}

/** macOS-style cascading column browser: picking a folder opens its children in the next column;
 *  picking a file selects it (driving the inspector) and trims deeper columns. Double-click opens. */
const MillerView = ({ rootFolderId, selection, onOpen, actions }: MillerViewProps) => {
  const [trail, setTrail] = useState<string[]>([])

  useEffect(() => {
    setTrail([])
  }, [rootFolderId])

  const columnIds: (string | undefined)[] = [rootFolderId, ...trail]

  const pick = (columnIndex: number, node: DriveNode) => {
    selection.selectOnly(node.id)
    setTrail((previous) =>
      node.kind === "folder"
        ? [...previous.slice(0, columnIndex), node.id]
        : previous.slice(0, columnIndex),
    )
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-x-auto">
      {columnIds.map((id, index) => (
        <MillerColumn
          key={`${index}:${id ?? "root"}`}
          folderId={id}
          activeId={trail[index]}
          selection={selection}
          onPick={(node) => pick(index, node)}
          onOpen={onOpen}
          actions={actions}
        />
      ))}
    </div>
  )
}

export default MillerView
