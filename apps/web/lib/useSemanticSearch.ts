import { useEffect, useState } from "react"
import { dbg } from "@lib/debug"
import { cosine, embedText, embedderSupported } from "@lib/embedder"
import { isUnlocked } from "@workspace/core/e2e"
import { fetchIndex, getSearchThreshold, onIndexChanged, searchPrompt } from "@lib/photoIndex"
import { useQuery, useQueryClient } from "@tanstack/react-query"

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
  const queryClient = useQueryClient()
  const { data: index } = useQuery({
    queryKey: ["photos", "clip-index"],
    queryFn: fetchIndex,
    enabled,
    staleTime: 60_000,
  })

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const off = onIndexChanged(() => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["photos", "clip-index"] })
      }, 1500)
    })
    return () => {
      clearTimeout(timer)
      off()
    }
  }, [queryClient])

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
    void embedText(searchPrompt(q))
      .then((queryVector) => {
        if (cancelled) return
        const scored: Array<[string, number]> = []
        for (const [id, vector] of index) scored.push([id, cosine(queryVector, vector)])
        scored.sort((a, b) => b[1] - a[1])
        const best = scored[0]?.[1] ?? 0
        const threshold = getSearchThreshold()
        const ids = scored.filter(([, score]) => score >= threshold).map(([id]) => id)
        dbg(
          "search",
          `"${q}" → ${ids.length} result(s) ≥ ${threshold}, top score ${best.toFixed(3)}`,
          scored.slice(0, 5).map(([id, s]) => `${id}:${s.toFixed(3)}`),
        )
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
