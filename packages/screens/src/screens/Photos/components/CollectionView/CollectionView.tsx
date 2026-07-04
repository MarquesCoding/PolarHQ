import type { ReactNode } from "react"
import type { TimelinePage } from "@workspace/core/photos"
import { downloadItemFor, expandStacksToDownloadItems } from "@workspace/core/photosE2e"
import { SelectionProvider, useSelection } from "@workspace/screens/selection"
import { useAssetFeed } from "@workspace/screens/useAssetFeed"
import { type ArmedConfirm, useArmedConfirm } from "@workspace/screens/useArmedConfirm"
import { useSelectionHotkeys } from "@workspace/screens/useSelectionHotkeys"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { useAppSelector } from "@workspace/screens/store/hooks"
import SelectionBar from "@components/SelectionBar/SelectionBar"
import { PageSpinner } from "@components/Spinner/Spinner"
import PhotoWorkspace from "@pages/Photos/workspace/PhotoWorkspace"

export interface CollectionViewProps {
  title: string
  queryKey: unknown[]
  fetcher: (cursor?: string) => Promise<TimelinePage>
  emptyText: string
  /** Optional rich empty state (icon + copy); falls back to `emptyText` when omitted. */
  emptyState?: ReactNode
  /** Optional subtle banner shown above the grid (e.g. the trash auto-delete notice). */
  notice?: ReactNode
  actions: (ids: string[], afterAction: () => void, deleteConfirm: ArmedConfirm) => ReactNode
  onDeleteSelected?: (ids: string[]) => Promise<unknown>
  deleteMessage?: string
}

const CollectionInner = ({
  queryKey,
  fetcher,
  emptyText,
  emptyState,
  notice,
  actions,
  onDeleteSelected,
  deleteMessage,
}: CollectionViewProps) => {
  const { t } = useTranslation("photos")
  const selection = useSelection()
  const { query, assets, invalidate } = useAssetFeed(queryKey, fetcher)
  const search = useAppSelector((state) => state.ui.searchQuery).trim().toLowerCase()
  const visible = search
    ? assets.filter((asset) => asset.originalFilename.toLowerCase().includes(search))
    : assets
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

  const deleteConfirm = useArmedConfirm(() => {
    if (!onDeleteSelected) return
    void onDeleteSelected(ids)
      .then(() => {
        toast.success(deleteMessage ?? t("collectionView.movedToTrash"))
        afterAction()
      })
      .catch(() => toast.error(t("errors:actionFailed")))
  })
  useSelectionHotkeys({
    active: selection.count > 0,
    onClear: selection.clear,
    confirm: deleteConfirm,
    onSelectAll: () => selection.selectAll(assets.map((asset) => asset.id)),
  })

  return (
    <div className="flex flex-1 flex-col p-6">
      {notice ? <div className="mb-4">{notice}</div> : null}

      {query.isLoading ? (
        <PageSpinner />
      ) : visible.length === 0 ? (
        search ? (
          <p className="text-muted-foreground text-sm">{t("collectionView.noSearchMatch")}</p>
        ) : (
          (emptyState ?? <p className="text-muted-foreground text-sm">{emptyText}</p>)
        )
      ) : (
        <PhotoWorkspace
          assets={visible}
          showModes={false}
          onInvalidate={invalidate}
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
