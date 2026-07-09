import { useEffect, useState } from "react"
import { fetchDecryptedPhotoThumbnail } from "@workspace/core/photosE2e"
import type { GridAsset } from "./types"

// Shared decrypted-thumbnail store: each asset's thumbnail is decrypted at most once for the whole
// app (grid, filmstrip, anywhere), concurrent requests for the same id share a single decrypt, and
// the cache only changes when an action does (see invalidateThumbnail on delete/replace).
const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()

export const getCachedThumbnail = (id: string): string | undefined => cache.get(id)

export const loadThumbnail = (id: string): Promise<string | null> => {
  const cached = cache.get(id)
  if (cached) return Promise.resolve(cached)
  const existing = inflight.get(id)
  if (existing) return existing
  const promise = fetchDecryptedPhotoThumbnail(id).then((url) => {
    inflight.delete(id)
    if (url) cache.set(id, url)
    return url
  })
  inflight.set(id, promise)
  return promise
}

/** Drop an asset's cached thumbnail (e.g. it was replaced by an edit) so it re-decrypts next time. */
export const invalidateThumbnail = (id: string): void => {
  const url = cache.get(id)
  if (url) URL.revokeObjectURL(url)
  cache.delete(id)
  inflight.delete(id)
}

/** The decrypted thumbnail URL for an asset, from the shared store (decrypts once, deduped). */
export const useThumbnail = (asset: GridAsset): string | null => {
  const [src, setSrc] = useState<string | null>(() =>
    asset.encrypted ? (getCachedThumbnail(asset.id) ?? null) : asset.thumbnailUrl,
  )
  useEffect(() => {
    if (!asset.encrypted) {
      setSrc(asset.thumbnailUrl)
      return
    }
    const cached = getCachedThumbnail(asset.id)
    if (cached) {
      setSrc(cached)
      return
    }
    if (!asset.thumbnailUrl) return
    let live = true
    void loadThumbnail(asset.id).then((url) => {
      if (live && url) setSrc(url)
    })
    return () => {
      live = false
    }
  }, [asset.id, asset.encrypted, asset.thumbnailUrl])
  return src
}
