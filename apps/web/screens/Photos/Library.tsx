"use client"

import { useEffect, useState } from "react"
import { decryptName } from "@lib/e2e"
import { installPhotoDebug } from "@lib/photoDebug"
import { ensureIndexing } from "@lib/photoIndex"
import {
  type GridAsset,
  favoriteAssets,
  fetchAssets,
  stackAssets,
  trashAssets,
  unstackAssets,
} from "@lib/photos"
import { downloadItemFor, expandStacksToDownloadItems } from "@lib/photosE2e"
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
import { Image, Stack, StackMinus } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const LibraryInner = () => {
  const { t } = useTranslation("photos")
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
  const selectedAssets = assets.filter((asset) => selectedSet.has(asset.id))
  const downloadItems = selectedAssets.map(downloadItemFor)
  const burstFrames = selectedAssets.reduce(
    (total, asset) => total + (asset.stackId && asset.stackCount > 1 ? asset.stackCount : 1),
    0,
  )
  const downloadAllFrames =
    burstFrames > selectedAssets.length
      ? { count: burstFrames, resolve: () => expandStacksToDownloadItems(selectedAssets) }
      : undefined
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
      toast.error(t("library.actionFailed"))
    }
  }

  const trashSelected = () => {
    const target = [...ids]
    if (target.length === 0) return
    selection.clear()
    upload.task(
      t("library.deleting", { count: target.length }),
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

  const stackedOne = one?.stackId && one.stackCount > 1 ? one : undefined
  const stack = () => run(() => stackAssets(ids), t("library.stacked"))
  const unstack = () =>
    stackedOne?.stackId
      ? run(() => unstackAssets(stackedOne.stackId as string), t("library.unstacked"))
      : undefined

  const favourite = () => run(() => favoriteAssets(ids, true), t("library.addedToFavourites"))
  const download = () => {
    if (downloadItems.length === 0) return
    upload.download(downloadItems.length === 1 ? t("library.photo") : t("library.photosZip", { count: downloadItems.length }), downloadItems)
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
    onSelectAll: () => selection.selectAll(visible.map((asset) => asset.id)),
  })

  return (
    <DropZone
      className="relative flex flex-1 flex-col"
      onFiles={(files) => upload.upload(files)}
    >
      {query.isLoading ? (
        <PageSpinner />
      ) : visible.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Image className="size-8" />
          <p className="text-sm">
            {search ? t("library.noMatches") : t("library.dragToUpload")}
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
        downloadAllFrames={downloadAllFrames}
        shareAssetId={one?.id}
        shareName={one ? nameOf(one) : undefined}
        shareEncrypted={one?.encrypted}
        shareOpen={shareOpen}
        onShareOpenChange={setShareOpen}
      >
        <Button variant="ghost" size="sm" onClick={favourite}>
          <Icon name="favourites" className="size-4" />
          {t("library.favourite")}
          <Kbd>⇧F</Kbd>
        </Button>
        {ids.length >= 2 ? (
          <Button variant="ghost" size="sm" onClick={stack}>
            <Stack className="size-4" />
            {t("library.stack")}
          </Button>
        ) : null}
        {stackedOne ? (
          <Button variant="ghost" size="sm" onClick={unstack}>
            <StackMinus className="size-4" />
            {t("library.unstack")}
          </Button>
        ) : null}
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
          {t("library.trash")}
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
