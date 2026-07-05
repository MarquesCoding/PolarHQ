import { useCallback } from "react"
import { useNavigation } from "@workspace/screens/platform"
import {
  deleteAlbum,
  favoriteAssets,
  fetchAlbum,
  removeFromAlbum,
  trashAssets,
} from "@workspace/core/photos"
import { downloadItemFor, expandStacksToDownloadItems } from "@workspace/core/photosE2e"
import { SelectionProvider, useSelection } from "@workspace/screens/selection"
import { type LiveEvent, useLiveEvents } from "@workspace/screens/useLiveEvents"
import { useArmedConfirm } from "@workspace/screens/useArmedConfirm"
import { useSelectionHotkeys } from "@workspace/screens/useSelectionHotkeys"
import SelectionBar from "@components/SelectionBar/SelectionBar"
import { PageSpinner } from "@components/Spinner/Spinner"
import PhotoWorkspace from "@pages/Photos/workspace/PhotoWorkspace"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import { Icon } from "@workspace/screens/icons"
import { ArrowLeft, MinusCircle } from "@phosphor-icons/react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const AlbumDetailInner = ({ albumId }: { albumId: string }) => {
  const { t } = useTranslation("photos")
  const router = useNavigation()
  const queryClient = useQueryClient()
  const selection = useSelection()

  const { data, isLoading } = useQuery({
    queryKey: ["photos", "album", albumId],
    queryFn: () => fetchAlbum(albumId),
  })

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["photos", "album", albumId] })
    void queryClient.invalidateQueries({ queryKey: ["photos", "albums"] })
  }, [queryClient, albumId])

  const onEvent = useCallback(
    (event: LiveEvent) => {
      if (event.type.startsWith("photos.asset")) invalidate()
    },
    [invalidate],
  )
  useLiveEvents(onEvent)

  const assets = data?.assets ?? []
  const ids = [...selection.selected]
  const one = ids.length === 1 ? assets.find((asset) => asset.id === ids[0]) : undefined
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
      toast.error(t("albumDetailInner.actionFailed"))
    }
  }

  const trashConfirm = useArmedConfirm(() =>
    void run(() => trashAssets(ids), t("albumDetailInner.movedToTrash")),
  )
  useSelectionHotkeys({
    active: selection.count > 0,
    onClear: selection.clear,
    confirm: trashConfirm,
    onSelectAll: () => selection.selectAll(assets.map((asset) => asset.id)),
  })

  const removeAlbum = useMutation({
    mutationFn: () => deleteAlbum(albumId),
    onSuccess: () => {
      toast.success(t("albumDetailInner.albumDeleted"))
      void queryClient.invalidateQueries({ queryKey: ["photos", "albums"] })
      router.push("/photos/albums")
    },
    onError: () => toast.error(t("albumDetailInner.couldNotDeleteAlbum")),
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("albumDetailInner.backToAlbums")}
            onClick={() => router.push("/photos/albums")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="truncate text-xl font-semibold">
            {data?.album.name ?? t("albumDetailInner.albumFallback")}
          </h1>
        </div>
        <ConfirmButton
          idleVariant="outline"
          icon={<Icon name="trash" className="size-4" />}
          onConfirm={() => removeAlbum.mutate()}
        >
          {t("albumDetailInner.deleteAlbum")}
        </ConfirmButton>
      </header>

      {isLoading ? (
        <PageSpinner />
      ) : assets.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {t("albumDetailInner.emptyAlbum")}
        </p>
      ) : (
        <PhotoWorkspace assets={assets} showModes={false} onInvalidate={invalidate} />
      )}

      <SelectionBar
        contentCentered
        downloadItems={downloadItems}
        downloadAllFrames={downloadAllFrames}
        shareAssetId={one?.id}
        shareName={one ? downloadItemFor(one).name : undefined}
        shareEncrypted={one?.encrypted}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            run(() => favoriteAssets(ids, true), t("albumDetailInner.addedToFavourites"))
          }
        >
          <Icon name="favourites" className="size-4" />
          {t("albumDetailInner.favourite")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            run(() => removeFromAlbum(albumId, ids), t("albumDetailInner.removedFromAlbum"))
          }
        >
          <MinusCircle className="size-4" />
          {t("albumDetailInner.remove")}
        </Button>
        <ConfirmButton
          icon={<Icon name="trash" className="size-4" />}
          armed={trashConfirm.armed}
          onTrigger={trashConfirm.trigger}
        >
          {t("albumDetailInner.trash")}
        </ConfirmButton>
      </SelectionBar>
    </div>
  )
}

const AlbumDetail = ({ albumId }: { albumId: string }) => (
  <SelectionProvider>
    <AlbumDetailInner albumId={albumId} />
  </SelectionProvider>
)

export default AlbumDetail
