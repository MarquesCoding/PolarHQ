"use client"

import { setDebug } from "@lib/debug"
import { MODEL_VERSION, cosine, embedText, embedderSupported, warmupEmbedder } from "@lib/embedder"
import { isUnlocked } from "@lib/e2e"
import { ensureIndexing, fetchIndex, fetchMissing } from "@lib/photoIndex"

/**
 * Console debugging for the on-device ML pipeline. Attaches `window.orbit.ml` with helpers
 * to inspect and drive the semantic index from the browser console:
 *
 *   await orbit.ml.status()        // indexed / missing counts, embedder support
 *   await orbit.ml.search("dog")   // top matches with scores (console.table)
 *   orbit.ml.enableLogs()          // verbose pipeline logs (reload after)
 *   orbit.ml.reindex()             // (re)run the background backfill
 */
export const installPhotoDebug = (): void => {
  if (typeof window === "undefined") return
  const w = window as unknown as { orbit?: Record<string, unknown> }
  w.orbit = w.orbit ?? {}

  w.orbit.ml = {
    modelVersion: MODEL_VERSION,
    enableLogs: () => {
      setDebug(true)
      console.log("[orbit:ml] logs on — reload to capture worker startup")
    },
    disableLogs: () => setDebug(false),
    warmup: () => warmupEmbedder(),
    reindex: () => ensureIndexing(),
    status: async () => {
      const [index, missing] = await Promise.all([fetchIndex(), fetchMissing()])
      const status = {
        unlocked: isUnlocked(),
        embedderSupported: embedderSupported(),
        webgpu: typeof navigator !== "undefined" && "gpu" in navigator,
        modelVersion: MODEL_VERSION,
        indexed: index.size,
        missing: missing.length,
      }
      console.table(status)
      return status
    },
    search: async (query: string, topN = 20) => {
      const [index, queryVector] = await Promise.all([fetchIndex(), embedText(query)])
      const results = [...index]
        .map(([assetId, vector]) => ({ assetId, score: Number(cosine(queryVector, vector).toFixed(4)) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
      console.table(results)
      return results
    },
  }

  console.log("[orbit:ml] debug ready — try `await orbit.ml.status()` or `await orbit.ml.search(\"beach\")`")
}
