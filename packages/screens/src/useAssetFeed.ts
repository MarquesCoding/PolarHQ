import { useCallback, useEffect, useRef } from "react"
import type { GridAsset, TimelinePage } from "@workspace/core/photos"
import { type LiveEvent, useLiveEvents } from "./useLiveEvents"
import { type InfiniteData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query"

type FeedData = InfiniteData<TimelinePage, string | undefined>

/**
 * Asset feed for a view, auto-refreshed by WebSocket events. Eagerly loads the
 * whole timeline (all pages) so the justified layout and date scrubber cover
 * every date; rendering stays virtualized, so only on-screen tiles mount.
 *
 * Local mutations should call {@link patchAssets}/{@link removeAssets} for an instant, refetch-free
 * update; the debounced live-event handler reconciles with the server afterward.
 */
export const useAssetFeed = (
  queryKey: unknown[],
  fetcher: (cursor?: string) => Promise<TimelinePage>,
) => {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetcher(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last, _all, lastParam) => {
      if (!last.nextCursor || last.assets.length === 0) return undefined
      if (last.nextCursor === lastParam) return undefined
      return last.nextCursor
    },
  })

  useEffect(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage()
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage])

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey })
    void queryClient.invalidateQueries({ queryKey: ["photos", "usage"] })
  }, [queryClient, queryKey])

  /** Patch fields on some assets in-place (optimistic) — no refetch. */
  const patchAssets = useCallback(
    (ids: string[], patch: Partial<GridAsset>) => {
      const set = new Set(ids)
      queryClient.setQueryData<FeedData>(queryKey, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                assets: page.assets.map((asset) =>
                  set.has(asset.id) ? { ...asset, ...patch } : asset,
                ),
              })),
            }
          : data,
      )
    },
    [queryClient, queryKey],
  )

  /** Drop assets from the feed in-place (optimistic, e.g. trashed) — no refetch. */
  const removeAssets = useCallback(
    (ids: string[]) => {
      const set = new Set(ids)
      queryClient.setQueryData<FeedData>(queryKey, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                assets: page.assets.filter((asset) => !set.has(asset.id)),
              })),
            }
          : data,
      )
    },
    [queryClient, queryKey],
  )

  // Coalesce WebSocket-driven refetches: a burst of asset events (including echoes of our own
  // optimistic mutations) collapses into a single reconciling refetch instead of one per event.
  const debounce = useRef<number | undefined>(undefined)
  const onEvent = useCallback(
    (event: LiveEvent) => {
      if (!event.type.startsWith("photos.asset")) return
      window.clearTimeout(debounce.current)
      debounce.current = window.setTimeout(invalidate, 1500)
    },
    [invalidate],
  )
  useLiveEvents(onEvent)
  useEffect(() => () => window.clearTimeout(debounce.current), [])

  const seen = new Set<string>()
  const assets: GridAsset[] = []
  for (const page of query.data?.pages ?? []) {
    for (const asset of page.assets) {
      if (seen.has(asset.id)) continue
      seen.add(asset.id)
      assets.push(asset)
    }
  }
  return { query, assets, invalidate, patchAssets, removeAssets }
}
