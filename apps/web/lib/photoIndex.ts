"use client"

import { apiFetch } from "@lib/apiClient"
import { dbg } from "@lib/debug"
import { MODEL_VERSION, embedImage, embedderSupported } from "@lib/embedder"
import { decryptWithMetaKey, encryptWithMetaKey, isUnlocked } from "@lib/e2e"
import { fetchDecryptedPhotoOriginal } from "@lib/photosE2e"

/**
 * The client-side semantic index. CLIP vectors are computed in the browser, stored encrypted
 * under the account metadata key, and searched locally — the server never sees a vector or a
 * query. This module owns encrypt/store/fetch + the background backfill of existing photos.
 */

const KIND = "clip"

const f32ToBytes = (v: Float32Array): Uint8Array =>
  new Uint8Array(v.buffer, v.byteOffset, v.byteLength)

const bytesToF32 = (b: Uint8Array): Float32Array =>
  new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength))

/** Encrypt + store an asset's embedding (no-op while locked). */
export const storeEmbedding = async (assetId: string, vector: Float32Array): Promise<void> => {
  const encrypted = encryptWithMetaKey(f32ToBytes(vector))
  if (!encrypted) return
  await apiFetch(`/api/v1/photos/assets/${assetId}/embedding`, {
    method: "PUT",
    body: JSON.stringify({ kind: KIND, modelVersion: MODEL_VERSION, vector: encrypted }),
  })
}

/** Embed an image blob and store the encrypted vector. Returns the vector. */
export const embedAndStore = async (assetId: string, blob: Blob): Promise<Float32Array> => {
  const vector = await embedImage(blob)
  await storeEmbedding(assetId, vector)
  dbg("index", "embedded + stored", assetId)
  return vector
}

/** Fetch + decrypt the whole CLIP index into memory (skipping other model versions). */
export const fetchIndex = async (): Promise<Map<string, Float32Array>> => {
  const { embeddings } = await apiFetch<{
    embeddings: { assetId: string; modelVersion: string; vector: string }[]
  }>(`/api/v1/photos/embeddings?kind=${KIND}`)
  const index = new Map<string, Float32Array>()
  for (const row of embeddings) {
    if (row.modelVersion !== MODEL_VERSION) continue
    const bytes = decryptWithMetaKey(row.vector)
    if (bytes) index.set(row.assetId, bytesToF32(bytes))
  }
  dbg("index", `fetched index: ${index.size} vector(s) (${embeddings.length} rows)`)
  return index
}

/** Asset ids that still need a CLIP embedding (the backfill worklist). */
export const fetchMissing = (): Promise<string[]> =>
  apiFetch<{ assetIds: string[] }>(`/api/v1/photos/embeddings/missing?kind=${KIND}`).then(
    (r) => r.assetIds,
  )

/**
 * Index existing photos in the background: decrypt each original client-side, embed it, store
 * the encrypted vector. Sequential to avoid thrashing the (single) model worker. Cancellable.
 */
export const runBackfill = async (
  onProgress?: (done: number, total: number) => void,
  shouldStop?: () => boolean,
): Promise<void> => {
  if (!isUnlocked() || !embedderSupported()) return
  const ids = await fetchMissing()
  dbg("index", `backfill: ${ids.length} photo(s) to index`)
  for (let i = 0; i < ids.length; i += 1) {
    if (shouldStop?.()) return
    const url = await fetchDecryptedPhotoOriginal(ids[i]!, "image/jpeg")
    if (!url) continue
    try {
      const blob = await fetch(url).then((r) => r.blob())
      await embedAndStore(ids[i]!, blob)
    } catch {
      /* skip a photo that fails to embed */
    } finally {
      URL.revokeObjectURL(url)
    }
    onProgress?.(i + 1, ids.length)
    if ((i + 1) % 25 === 0 || i + 1 === ids.length)
      dbg("index", `backfill ${i + 1}/${ids.length}`)
  }
  dbg("index", "backfill done")
}

let indexing = false
/** Kick off a one-shot background backfill of the semantic index (idempotent per session). */
export const ensureIndexing = (): void => {
  if (indexing || !isUnlocked() || !embedderSupported()) return
  indexing = true
  void runBackfill()
    .catch(() => undefined)
    .finally(() => {
      indexing = false
    })
}
