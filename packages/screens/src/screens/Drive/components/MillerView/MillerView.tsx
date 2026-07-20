import { useEffect, useState } from "react"
import { type DriveNode, fetchNodes } from "@workspace/core/drive"
import { FileIcon } from "../../fileIcon"
import type { SelectionApi } from "@workspace/screens/selection"
import { CaretRight } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "react-i18next"
import Spinner from "@components/Spinner/Spinner"
import { useAppSelector } from "@workspace/screens/store/hooks"
import { compareNodes } from "@pages/Drive/sortNodes"
import NodeContextMenu, {
  type DriveNodeActions,
} from "@pages/Drive/components/NodeContextMenu/NodeContextMenu"

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
  const driveSort = useAppSelector((state) => state.ui.driveSort)
  const { data, isLoading } = useQuery({
    queryKey: ["drive", "nodes", folderId ?? "root"],
    queryFn: () => fetchNodes(folderId),
  })
  const nodes = [...(data?.children ?? [])].sort(compareNodes(driveSort))

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
                  <FileIcon node={node} className="size-5 shrink-0" />
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
