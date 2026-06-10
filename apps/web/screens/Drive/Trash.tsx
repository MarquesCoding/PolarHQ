"use client"

import { type DriveNode, deleteDriveNode, fetchDriveTrash, restoreDriveNode } from "@lib/drive"
import { SelectionProvider, useSelection } from "@lib/selection"
import { useArmedConfirm } from "@lib/useArmedConfirm"
import { useSelectionHotkeys } from "@lib/useSelectionHotkeys"
import { useAppSelector } from "@store/hooks"
import { IconRestore, IconTrashX } from "@tabler/icons-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import SelectionBar from "@components/SelectionBar/SelectionBar"
import { PageSpinner } from "@components/Spinner/Spinner"
import NodeGrid from "@pages/Drive/components/NodeGrid/NodeGrid"
import NodeTable from "@pages/Drive/components/NodeTable/NodeTable"

const TrashInner = () => {
  const { t } = useTranslation("drive")
  const queryClient = useQueryClient()
  const selection = useSelection()
  const viewMode = useAppSelector((state) => state.ui.viewMode)
  const { data, isLoading } = useQuery({ queryKey: ["drive", "trash"], queryFn: fetchDriveTrash })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["drive"] })
    void queryClient.invalidateQueries({ queryKey: ["photos"] })
  }

  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action()
      toast.success(message)
      selection.clear()
      invalidate()
    } catch {
      toast.error(t("trash.actionFailed"))
    }
  }

  const nodes = data?.children ?? []
  const ids = [...selection.selected]
  const restore = (list: string[]) =>
    run(() => Promise.all(list.map((id) => restoreDriveNode(id))), t("trash.restored"))
  const remove = (list: string[]) =>
    run(() => Promise.all(list.map((id) => deleteDriveNode(id))), t("trash.permanentlyDeleted"))

  const removeConfirm = useArmedConfirm(() => void remove(ids))
  useSelectionHotkeys({
    active: selection.count > 0,
    onClear: selection.clear,
    confirm: removeConfirm,
    onSelectAll: () => selection.selectAll(nodes.map((node) => node.id)),
  })

  const open = (node: DriveNode) => {
    if (node.kind === "file" && node.downloadUrl) window.open(node.downloadUrl, "_blank")
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <div className="flex items-baseline gap-2">
        <h1 className="text-foreground text-sm font-medium">{t("trash.title")}</h1>
        <p className="text-muted-foreground text-xs">
          {t("trash.retentionNotice")}
        </p>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : nodes.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("trash.empty")}</p>
      ) : viewMode === "table" ? (
        <NodeTable nodes={nodes} selection={selection} onOpen={open} />
      ) : (
        <NodeGrid nodes={nodes} selection={selection} onOpen={open} />
      )}

      <SelectionBar>
        <Button variant="ghost" size="sm" onClick={() => void restore(ids)}>
          <IconRestore className="size-4" />
          {t("trash.restore")}
        </Button>
        <ConfirmButton
          icon={<IconTrashX className="size-4" />}
          armed={removeConfirm.armed}
          onTrigger={removeConfirm.trigger}
        >
          {t("trash.deleteForever")}
        </ConfirmButton>
      </SelectionBar>
    </div>
  )
}

const Trash = () => (
  <SelectionProvider>
    <TrashInner />
  </SelectionProvider>
)

export default Trash
