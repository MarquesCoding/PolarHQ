"use client"

import { useEffect, useState } from "react"
import { decryptName } from "@lib/e2e"
import { installPhotoDebug } from "@lib/photoDebug"
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
import { Kbd } from "@workspace/ui/components/kbd"
import { toast } from "sonner"

const LibraryInner = () => {
  const selection = useSelection()
  const upload = useUploadManager()
  const search = useAppSelector((state) => state.ui.searchQuery).trim().toLowerCase()

  const { query, assets, invalidate } = useAssetFeed(["photos", "timeline"], (cursor) =>
    fetchAssets({ view: "library", cursor }),
  )

  useEffect(() => {
    installPhotoDebug()
    ensureIndexing()
  }, [])
  const semantic = useSemanticSearch(search)

  useEffect(() => {
    if (search && query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage()
  }, [search, query.hasNextPage, query.isFetchingNextPage, query])

  const nameOf = (asset: GridAsset): string =>
    (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename
  const byId = new Map(assets.map((asset) => [asset.id, asset]))
  const visible = !search
    ? assets
    : semantic.rankedIds
      ? semantic.rankedIds
          .map((id) => byId.get(id))
          .filter((asset): asset is GridAsset => Boolean(asset))
      : assets.filter((asset) => nameOf(asset).toLowerCase().includes(search))

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

  const trashSelected = () => {
    const target = [...ids]
    if (target.length === 0) return
    selection.clear()
    upload.task(
      `Deleting ${target.length} photo${target.length === 1 ? "" : "s"}`,
      target.length,
      async (onProgress) => {
        const CHUNK = 25
        for (let i = 0; i < target.length; i += CHUNK) {
          await trashAssets(target.slice(i, i + CHUNK))
          onProgress(Math.min(i + CHUNK, target.length))
        }
      },
    )
  }
  const trashConfirm = useArmedConfirm(trashSelected)

  const [albumOpen, setAlbumOpen] = useState(false)
  const [tagOpen, setTagOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const favourite = () => run(() => favoriteAssets(ids, true), "Added to favourites")
  const download = () => {
    if (downloadItems.length === 0) return
    upload.download(downloadItems.length === 1 ? "Photo" : `${downloadItems.length} photos.zip`, downloadItems)
  }

  useSelectionHotkeys({
    active: selection.count > 0,
    onClear: selection.clear,
    confirm: trashConfirm,
    onFavourite: favourite,
    onDownload: download,
    onAlbum: () => setAlbumOpen(true),
    onTag: () => setTagOpen(true),
    onShare: one ? () => setShareOpen(true) : undefined,
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
        shareName={one ? nameOf(one) : undefined}
        shareEncrypted={one?.encrypted}
        shareOpen={shareOpen}
        onShareOpenChange={setShareOpen}
      >
        <Button variant="ghost" size="sm" onClick={favourite}>
          <Icon name="favourites" className="size-4" />
          Favourite
          <Kbd>⇧F</Kbd>
        </Button>
        <AddToAlbumDialog
          assetIds={ids}
          onDone={afterAction}
          open={albumOpen}
          onOpenChange={setAlbumOpen}
        />
        <TagDialog assetIds={ids} onDone={afterAction} open={tagOpen} onOpenChange={setTagOpen} />
        <ConfirmButton
          icon={<Icon name="trash" className="size-4" />}
          armed={trashConfirm.armed}
          onTrigger={trashConfirm.trigger}
        >
          Trash
          <Kbd>⇧D</Kbd>
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
