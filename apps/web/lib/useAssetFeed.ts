import { useCallback, useEffect } from "react"
import type { GridAsset, TimelinePage } from "@workspace/core/photos"
import { type LiveEvent, useLiveEvents } from "@lib/useLiveEvents"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"

/**
 * Asset feed for a view, auto-refreshed by WebSocket events. Eagerly loads the
 * whole timeline (all pages) so the justified layout and date scrubber cover
 * every date; rendering stays virtualized, so only on-screen tiles mount.
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

  const onEvent = useCallback(
    (event: LiveEvent) => {
      if (event.type.startsWith("photos.asset")) invalidate()
    },
    [invalidate],
  )
  useLiveEvents(onEvent)

  const seen = new Set<string>()
  const assets: GridAsset[] = []
  for (const page of query.data?.pages ?? []) {
    for (const asset of page.assets) {
      if (seen.has(asset.id)) continue
      seen.add(asset.id)
      assets.push(asset)
    }
  }
  return { query, assets, invalidate }
}
