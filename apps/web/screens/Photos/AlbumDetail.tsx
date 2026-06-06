"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  deleteAlbum,
  favoriteAssets,
  fetchAlbum,
  removeFromAlbum,
  trashAssets,
} from "@lib/photos"
import { downloadItemFor } from "@lib/photosE2e"
import { SelectionProvider, useSelection } from "@lib/selection"
import { type LiveEvent, useLiveEvents } from "@lib/useLiveEvents"
import { useArmedConfirm } from "@lib/useArmedConfirm"
import { useSelectionHotkeys } from "@lib/useSelectionHotkeys"
import SelectionBar from "@components/SelectionBar/SelectionBar"
import { PageSpinner } from "@components/Spinner/Spinner"
import PhotoGrid from "@pages/Photos/components/PhotoGrid/PhotoGrid"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import { Icon } from "@lib/icons"
import { IconArrowLeft, IconCircleMinus } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"

const AlbumDetailInner = ({ albumId }: { albumId: string }) => {
  const router = useRouter()
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

  const removeAlbum = useMutation({
    mutationFn: () => deleteAlbum(albumId),
    onSuccess: () => {
      toast.success("Album deleted")
      void queryClient.invalidateQueries({ queryKey: ["photos", "albums"] })
      router.push("/photos/albums")
    },
    onError: () => toast.error("Could not delete album"),
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Back to albums"
            onClick={() => router.push("/photos/albums")}
          >
            <IconArrowLeft className="size-4" />
          </Button>
          <h1 className="truncate text-xl font-semibold">{data?.album.name ?? "Album"}</h1>
        </div>
        <ConfirmButton
          idleVariant="outline"
          icon={<Icon name="trash" className="size-4" />}
          onConfirm={() => removeAlbum.mutate()}
        >
          Delete album
        </ConfirmButton>
      </header>

      {isLoading ? (
        <PageSpinner />
      ) : assets.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          This album is empty. Add photos from your library.
        </p>
      ) : (
        <PhotoGrid assets={assets} />
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => run(() => removeFromAlbum(albumId, ids), "Removed from album")}
        >
          <IconCircleMinus className="size-4" />
          Remove
        </Button>
        <ConfirmButton
          icon={<Icon name="trash" className="size-4" />}
          armed={trashConfirm.armed}
          onTrigger={trashConfirm.trigger}
        >
          Trash
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
