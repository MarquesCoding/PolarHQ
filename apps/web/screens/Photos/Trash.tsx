"use client"

import { deleteAssets, emptyTrash, fetchAssets, restoreAssets } from "@lib/photos"
import { Icon } from "@lib/icons"
import CollectionView from "@pages/Photos/components/CollectionView/CollectionView"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import EmptyState from "@components/EmptyState/EmptyState"
import { TopBarActions } from "@components/FlatShell"
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
    <>
      <TopBarActions>
        <ConfirmButton
          icon={<IconTrashX className="size-4" />}
          confirmLabel="Empty trash?"
          idleVariant="destructive-solid"
          onConfirm={() => run(emptyTrash, "Trash emptied", refresh)}
        >
          Empty trash
        </ConfirmButton>
      </TopBarActions>

      <CollectionView
        title="Trash"
        queryKey={["photos", "trash"]}
        fetcher={(cursor) => fetchAssets({ view: "trash", cursor })}
        emptyText="Trash is empty."
        notice={
          <div className="border-border/60 bg-sidebar-accent/40 text-muted-foreground flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
            <Icon name="info" className="size-3.5 shrink-0" />
            Items in trash are permanently deleted after 30 days.
          </div>
        }
        emptyState={
          <EmptyState
            icon="trash"
            title="Trash is empty"
            hint="Deleted photos land here and are removed for good after 30 days."
          />
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
    </>
  )
}

export default Trash
