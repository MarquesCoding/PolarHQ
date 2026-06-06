"use client"

import { useEffect } from "react"
import { decryptName } from "@lib/e2e"
import { ensureIndexing } from "@lib/photoIndex"
import { type GridAsset, favoriteAssets, fetchAssets, trashAssets } from "@lib/photos"
import { downloadItemFor } from "@lib/photosE2e"
import { SelectionProvider, useSelection } from "@lib/selection"
import { useArmedConfirm } from "@lib/useArmedConfirm"
import { useAssetFeed } from "@lib/useAssetFeed"
import { useSelectionHotkeys } from "@lib/useSelectionHotkeys"
import { useSemanticSearch } from "@lib/useSemanticSearch"
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

  // Kick off the on-device semantic indexer once (idempotent), and search via CLIP.
  useEffect(() => ensureIndexing(), [])
  const semantic = useSemanticSearch(search)

  // While searching, eagerly load the whole library so semantic results aren't capped to
  // the first page (the grid's lazy paging is off during search).
  useEffect(() => {
    if (search && query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage()
  }, [search, query.hasNextPage, query.isFetchingNextPage, query])

  const nameOf = (asset: GridAsset): string =>
    (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename
  const visible = !search
    ? assets
    : semantic.rankedIds
      ? // Ranked by CLIP relevance, intersected with the loaded feed.
        (() => {
          const byId = new Map(assets.map((asset) => [asset.id, asset]))
          return semantic.rankedIds
            .map((id) => byId.get(id))
            .filter((asset): asset is GridAsset => Boolean(asset))
        })()
      : // No index yet — fall back to a (decrypted) filename match.
        assets.filter((asset) => nameOf(asset).toLowerCase().includes(search))

  const ids = [...selection.selected]
  const one = ids.length === 1 ? visible.find((asset) => asset.id === ids[0]) : undefined
  const selectedSet = new Set(ids)
  const downloadItems = assets.filter((asset) => selectedSet.has(asset.id)).map(downloadItemFor)
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
        downloadItems={downloadItems}
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
