"use client"

import { useEffect, useState } from "react"
import { cosine, embedText, embedderSupported } from "@lib/embedder"
import { isUnlocked } from "@lib/e2e"
import { fetchIndex } from "@lib/photoIndex"
import { useQuery } from "@tanstack/react-query"

// CLIP image↔text cosine for a real match sits well below 1; relevant results cluster near
// the top score. Keep results within a margin of the best, with an absolute floor, and always
// surface a few so a query is never silently empty.
const FLOOR = 0.18
const MARGIN = 0.1
const MIN_RESULTS = 8

interface SemanticSearch {
  /** Asset ids ranked by relevance, or null when there's no query / index isn't ready. */
  rankedIds: string[] | null
  searching: boolean
  indexReady: boolean
}

/**
 * On-device semantic search: the CLIP index is fetched + decrypted once, then each query is
 * embedded in the browser and ranked by cosine similarity. The query and vectors never leave
 * the device.
 */
export const useSemanticSearch = (query: string): SemanticSearch => {
  const enabled = isUnlocked() && embedderSupported()
  const { data: index } = useQuery({
    queryKey: ["photos", "clip-index"],
    queryFn: fetchIndex,
    enabled,
    staleTime: 60_000,
  })

  const [rankedIds, setRankedIds] = useState<string[] | null>(null)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (!q || !index || index.size === 0) {
      setRankedIds(null)
      return
    }
    let cancelled = false
    setSearching(true)
    void embedText(q)
      .then((queryVector) => {
        if (cancelled) return
        const scored: Array<[string, number]> = []
        for (const [id, vector] of index) scored.push([id, cosine(queryVector, vector)])
        scored.sort((a, b) => b[1] - a[1])
        const best = scored[0]?.[1] ?? 0
        const floor = Math.max(FLOOR, best - MARGIN)
        let ids = scored.filter(([, score]) => score >= floor).map(([id]) => id)
        if (ids.length < MIN_RESULTS) ids = scored.slice(0, MIN_RESULTS).map(([id]) => id)
        setRankedIds(ids)
      })
      .catch(() => setRankedIds(null))
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [query, index])

  return { rankedIds, searching, indexReady: Boolean(index) }
}
