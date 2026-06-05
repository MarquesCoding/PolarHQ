"use client"

import { favoriteAssets, fetchAssets, trashAssets } from "@lib/photos"
import { SelectionProvider, useSelection } from "@lib/selection"
import { useArmedConfirm } from "@lib/useArmedConfirm"
import { useAssetFeed } from "@lib/useAssetFeed"
import { useSelectionHotkeys } from "@lib/useSelectionHotkeys"
import { useUploadManager } from "@lib/uploadManager"
import { useAppSelector } from "@store/hooks"
import DropZone from "@components/DropZone/DropZone"
import SelectionBar from "@components/SelectionBar/SelectionBar"
import { PageSpinner } from "@components/Spinner/Spinner"
import AddToAlbumDialog from "@pages/Photos/components/AddToAlbumDialog/AddToAlbumDialog"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import PhotoGrid from "@pages/Photos/components/PhotoGrid/PhotoGrid"
import TagDialog from "@pages/Photos/components/TagDialog/TagDialog"
import { Icon } from "@lib/icons"
import { IconPhoto } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"

const LibraryInner = () => {
  const selection = useSelection()
  const upload = useUploadManager()
  const search = useAppSelector((state) => state.ui.searchQuery).trim().toLowerCase()

  const { query, assets, invalidate } = useAssetFeed(["photos", "timeline"], (cursor) =>
    fetchAssets({ view: "library", cursor }),
  )
  const visible = search
    ? assets.filter((asset) => asset.originalFilename.toLowerCase().includes(search))
    : assets

  const ids = [...selection.selected]
  const one = ids.length === 1 ? visible.find((asset) => asset.id === ids[0]) : undefined
  const afterAction = () => {
    invalidate()
    selection.clear()
  }
  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action()
      toast.success(message)
      afterAction()
    } catch {
      toast.error("Action failed")
    }
  }

  const trashConfirm = useArmedConfirm(() => void run(() => trashAssets(ids), "Moved to trash"))
  useSelectionHotkeys({
    active: selection.count > 0,
    onClear: selection.clear,
    confirm: trashConfirm,
  })

  return (
    <DropZone
      className="relative flex flex-1 flex-col gap-6 p-6"
      onFiles={(files) => upload.upload(files)}
    >
      {query.isLoading ? (
        <PageSpinner />
      ) : visible.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <IconPhoto className="size-8" />
          <p className="text-sm">
            {search ? "No photos match your search." : "Drag photos anywhere to upload them."}
          </p>
        </div>
      ) : (
        <PhotoGrid
          assets={visible}
          onReachEnd={
            search
              ? undefined
              : () => {
                  if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage()
                }
          }
        />
      )}

      <SelectionBar
        downloadAssetIds={ids}
        shareAssetId={one?.id}
        shareName={one?.originalFilename}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => run(() => favoriteAssets(ids, true), "Added to favourites")}
        >
          <Icon name="favourites" className="size-4" />
          Favourite
        </Button>
        <AddToAlbumDialog assetIds={ids} onDone={afterAction} />
        <TagDialog assetIds={ids} onDone={afterAction} />
        <ConfirmButton
          icon={<Icon name="trash" className="size-4" />}
          armed={trashConfirm.armed}
          onTrigger={trashConfirm.trigger}
        >
          Trash
        </ConfirmButton>
      </SelectionBar>
    </DropZone>
  )
}

const Library = () => (
  <SelectionProvider>
    <LibraryInner />
  </SelectionProvider>
)

export default Library
