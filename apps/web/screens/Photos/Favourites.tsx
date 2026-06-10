"use client"

import { favoriteAssets, fetchAssets, trashAssets } from "@lib/photos"
import { Icon } from "@lib/icons"
import CollectionView from "@pages/Photos/components/CollectionView/CollectionView"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import EmptyState from "@components/EmptyState/EmptyState"
import { IconHeartOff } from "@tabler/icons-react"
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

const Favourites = () => (
  <CollectionView
    title="Favourites"
    queryKey={["photos", "favourites"]}
    fetcher={(cursor) => fetchAssets({ view: "favourites", cursor })}
    emptyText="No favourites yet."
    emptyState={
      <EmptyState
        icon="favourites"
        title="No favourites yet"
        hint="Tap the heart on any photo to keep your best shots one click away."
      />
    }
    onDeleteSelected={trashAssets}
    actions={(ids, after, deleteConfirm) => (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => run(() => favoriteAssets(ids, false), "Removed from favourites", after)}
        >
          <IconHeartOff className="size-4" />
          Unfavourite
        </Button>
        <ConfirmButton
          icon={<Icon name="trash" className="size-4" />}
          armed={deleteConfirm.armed}
          onTrigger={deleteConfirm.trigger}
        >
          Trash
        </ConfirmButton>
      </>
    )}
  />
)

export default Favourites
