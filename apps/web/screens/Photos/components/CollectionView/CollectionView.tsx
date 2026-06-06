"use client"

import type { ReactNode } from "react"
import type { TimelinePage } from "@lib/photos"
import { downloadItemFor } from "@lib/photosE2e"
import { SelectionProvider, useSelection } from "@lib/selection"
import { useAssetFeed } from "@lib/useAssetFeed"
import { type ArmedConfirm, useArmedConfirm } from "@lib/useArmedConfirm"
import { useSelectionHotkeys } from "@lib/useSelectionHotkeys"
import { toast } from "sonner"
import { useAppSelector } from "@store/hooks"
import SelectionBar from "@components/SelectionBar/SelectionBar"
import { PageSpinner } from "@components/Spinner/Spinner"
import PhotoGrid from "@pages/Photos/components/PhotoGrid/PhotoGrid"

export interface CollectionViewProps {
  title: string
  queryKey: unknown[]
  fetcher: (cursor?: string) => Promise<TimelinePage>
  emptyText: string
  headerExtra?: ReactNode
  actions: (ids: string[], afterAction: () => void, deleteConfirm: ArmedConfirm) => ReactNode
  onDeleteSelected?: (ids: string[]) => Promise<unknown>
  deleteMessage?: string
}

const CollectionInner = ({
  queryKey,
  fetcher,
  emptyText,
  headerExtra,
  actions,
  onDeleteSelected,
  deleteMessage,
}: CollectionViewProps) => {
  const selection = useSelection()
  const { query, assets, invalidate } = useAssetFeed(queryKey, fetcher)
  const search = useAppSelector((state) => state.ui.searchQuery).trim().toLowerCase()
  const visible = search
    ? assets.filter((asset) => asset.originalFilename.toLowerCase().includes(search))
    : assets
  const ids = [...selection.selected]
  const one = ids.length === 1 ? visible.find((asset) => asset.id === ids[0]) : undefined
  const selectedSet = new Set(ids)
  const downloadItems = assets.filter((asset) => selectedSet.has(asset.id)).map(downloadItemFor)
  const afterAction = () => {
    invalidate()
    selection.clear()
  }

  const deleteConfirm = useArmedConfirm(() => {
    if (!onDeleteSelected) return
    void onDeleteSelected(ids)
      .then(() => {
        toast.success(deleteMessage ?? "Moved to trash")
        afterAction()
      })
      .catch(() => toast.error("Action failed"))
  })
  useSelectionHotkeys({
    active: selection.count > 0,
    onClear: selection.clear,
    confirm: deleteConfirm,
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {headerExtra ? (
        <div className="flex items-center justify-end gap-3">{headerExtra}</div>
      ) : null}

      {query.isLoading ? (
        <PageSpinner />
      ) : visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {search ? "No photos match your search." : emptyText}
        </p>
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
        shareName={one ? downloadItemFor(one).name : undefined}
        shareEncrypted={one?.encrypted}
      >
        {actions(ids, afterAction, deleteConfirm)}
      </SelectionBar>
    </div>
  )
}

const CollectionView = (props: CollectionViewProps) => (
  <SelectionProvider>
    <CollectionInner {...props} />
  </SelectionProvider>
)

export default CollectionView
