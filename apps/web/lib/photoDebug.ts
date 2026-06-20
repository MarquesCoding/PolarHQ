import { setDebug } from "@workspace/core/debug"
import { MODEL_VERSION, cosine, embedText, embedderSupported, warmupEmbedder } from "@lib/embedder"
import { isUnlocked } from "@workspace/core/e2e"
import {
  embedAsset,
  ensureIndexing,
  fetchIndex,
  fetchMissing,
  getSearchThreshold,
  searchPrompt,
  setSearchThreshold,
} from "@lib/photoIndex"
import { labelAsset } from "@lib/photoLabels"

/** Attach `window.orbit.ml` console helpers to inspect and drive the semantic index. */
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
    setThreshold: (value: number) => {
      setSearchThreshold(value)
      console.log(`[orbit:ml] search threshold set to ${value}`)
    },
    embed: async (assetId: string) => {
      const vector = await embedAsset(assetId)
      console.log(`[orbit:ml] embedded ${assetId}:`, vector ? `${vector.length}-d` : "unavailable")
      return Boolean(vector)
    },
    status: async () => {
      const [index, missing] = await Promise.all([fetchIndex(), fetchMissing()])
      const status = {
        unlocked: isUnlocked(),
        embedderSupported: embedderSupported(),
        webgpu: typeof navigator !== "undefined" && "gpu" in navigator,
        modelVersion: MODEL_VERSION,
        threshold: getSearchThreshold(),
        indexed: index.size,
        missing: missing.length,
      }
      console.table(status)
      return status
    },
    search: async (query: string, topN = 20) => {
      const [index, queryVector] = await Promise.all([fetchIndex(), embedText(searchPrompt(query))])
      const results = [...index]
        .map(([assetId, vector]) => ({ assetId, score: Number(cosine(queryVector, vector).toFixed(4)) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
      console.table(results)
      return results
    },
    labels: async (assetId?: string, topK = 10) => {
      const index = await fetchIndex()
      const id = assetId ?? [...index.keys()][0]
      if (!id) throw new Error("index is empty — nothing to label yet")
      const labels = await labelAsset(id, topK)
      console.log(`[orbit:ml] labels for ${id}:`)
      console.table(labels)
      return { assetId: id, labels }
    },
  }

  console.log("[orbit:ml] debug ready — try `await orbit.ml.status()` or `await orbit.ml.search(\"beach\")`")
}
