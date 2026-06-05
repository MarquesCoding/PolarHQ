import { useCallback, useEffect } from "react"
import type { TimelinePage } from "@lib/photos"
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
    getNextPageParam: (last) => last.nextCursor ?? undefined,
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

  const assets = (query.data?.pages ?? []).flatMap((page) => page.assets)
  return { query, assets, invalidate }
}
