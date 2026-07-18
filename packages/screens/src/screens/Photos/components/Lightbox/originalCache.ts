import { fetchDecryptedPhotoOriginal } from "@workspace/core/photosE2e"

/**
 * Session cache of decrypted full-size originals (as object URLs), so paging back and forth in the
 * lightbox doesn't re-download + re-decrypt the same multi-MB photo every time. An LRU bound keeps
 * memory in check (each entry holds a decrypted blob alive); evicted URLs are revoked. In-flight
 * requests are de-duplicated so prefetching a neighbour and opening it don't double-fetch.
 */
const MAX_ENTRIES = 12
const urls = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()

const touch = (id: string, url: string): void => {
  urls.delete(id)
  urls.set(id, url)
  while (urls.size > MAX_ENTRIES) {
    const oldest = urls.keys().next().value as string
    const stale = urls.get(oldest)
    urls.delete(oldest)
    if (stale?.startsWith("blob:")) URL.revokeObjectURL(stale)
  }
}

/** Decrypt + cache an asset's original, returning a stable object URL (cached on revisit). */
export const fetchCachedOriginal = (id: string, mimeType: string): Promise<string | null> => {
  const cached = urls.get(id)
  if (cached) {
    touch(id, cached)
    return Promise.resolve(cached)
  }
  const existing = inflight.get(id)
  if (existing) return existing

  const promise = fetchDecryptedPhotoOriginal(id, mimeType)
    .then((url) => {
      inflight.delete(id)
      if (url) touch(id, url)
      return url
    })
    .catch((error) => {
      inflight.delete(id)
      throw error
    })
  inflight.set(id, promise)
  return promise
}
