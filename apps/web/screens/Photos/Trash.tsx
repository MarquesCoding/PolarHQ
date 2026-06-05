"use client"

import { deleteAssets, emptyTrash, fetchAssets, restoreAssets } from "@lib/photos"
import CollectionView from "@pages/Photos/components/CollectionView/CollectionView"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import { useQueryClient } from "@tanstack/react-query"
import { IconRestore, IconTrashX } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"

const run = async (action: () => Promise<unknown>, message: string, after: () => void) => {
  try {
    await action()
    toast.success(message)
    after()
  } catch {
    toast.error("Action failed")
  }
}

const Trash = () => {
  const queryClient = useQueryClient()
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["photos"] })

  return (
    <CollectionView
      title="Trash"
      queryKey={["photos", "trash"]}
      fetcher={(cursor) => fetchAssets({ view: "trash", cursor })}
      emptyText="Trash is empty."
      headerExtra={
        <ConfirmButton
          icon={<IconTrashX className="size-4" />}
          confirmLabel="Empty trash?"
          onConfirm={() => run(emptyTrash, "Trash emptied", refresh)}
        >
          Empty trash
        </ConfirmButton>
      }
      onDeleteSelected={deleteAssets}
      deleteMessage="Permanently deleted"
      actions={(ids, after, deleteConfirm) => (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => run(() => restoreAssets(ids), "Restored", after)}
        >
          <IconRestore className="size-4" />
          Restore
        </Button>
        <ConfirmButton
          icon={<IconTrashX className="size-4" />}
          armed={deleteConfirm.armed}
          onTrigger={deleteConfirm.trigger}
        >
          Delete forever
        </ConfirmButton>
      </>
      )}
    />
  )
}

export default Trash
