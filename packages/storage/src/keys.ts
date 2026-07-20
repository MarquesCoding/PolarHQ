export interface AssetObjectKeys {
  original: string
  thumbnail: string
  preview: string
  video: string
  motion: string
  splat: string
}

/** Deterministic object keys for a photo asset's original + derivatives. */
export const assetObjectKeys = (
  ownerId: string,
  assetId: string,
  originalExt: string,
): AssetObjectKeys => {
  const ext = originalExt ? (originalExt.startsWith(".") ? originalExt : `.${originalExt}`) : ""
  const base = `users/${ownerId}/photos/${assetId}`
  return {
    original: `${base}/original${ext}`,
    thumbnail: `${base}/thumb.webp`,
    preview: `${base}/preview.webp`,
    video: `${base}/playback.mp4`,
    motion: `${base}/motion.bin`,
    splat: `${base}/splat.bin`,
  }
}
