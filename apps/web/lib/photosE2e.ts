"use client"

import { secretboxOpen, secretboxSeal } from "@lib/crypto"
import {
  createContentKey,
  decryptName,
  encryptName,
  encryptedPlaceholder,
  getDocContentKey,
  storeContentKey,
} from "@lib/e2e"
import { API_URL } from "@lib/env"
import type { Asset, GridAsset } from "@lib/photos"
import { analyzeAudio, analyzeImage, analyzeVideo } from "@lib/thumbnails"

/** Map an asset to a download item, resolving the encrypted filename for the saved file. */
export const downloadItemFor = (
  asset: Pick<GridAsset, "id" | "encrypted" | "encryptedName" | "originalFilename">,
): { id: string; name: string; encrypted: boolean } => ({
  id: asset.id,
  name: (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename,
  encrypted: asset.encrypted,
})

const putThumbnail = (url: string, body: Uint8Array): Promise<Response> =>
  fetch(url, {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/octet-stream" },
    body: body as BodyInit,
  })

/**
 * Upload media (image/video/audio) end-to-end encrypted, mirroring the Drive model: encrypt
 * the original with a fresh content key, generate + encrypt a thumbnail/poster client-side,
 * and send the dimensions/duration/takenAt/filename the grid needs (the server can't read
 * the ciphertext). The server stores only opaque bytes and runs no media processing.
 */
export const uploadEncryptedMedia = async (file: File): Promise<Asset> => {
  const key = createContentKey()
  const original = new Uint8Array(await file.arrayBuffer())

  // Decode once on the client for a thumbnail/poster + the metadata the grid needs.
  let thumbnail: Uint8Array | null = null
  let width: number | undefined
  let height: number | undefined
  let durationMs: number | undefined
  if (file.type.startsWith("video/")) {
    const v = await analyzeVideo(file).catch(() => null)
    if (v) ({ poster: thumbnail, width, height, durationMs } = v)
  } else if (file.type.startsWith("audio/")) {
    durationMs = await analyzeAudio(file).catch(() => 0)
  } else {
    const i = await analyzeImage(file)
    thumbnail = i.thumbnail
    width = i.width
    height = i.height
  }

  const encryptedName = encryptName(file.name)
  const form = new FormData()
  form.set(
    "file",
    new File([secretboxSeal(original, key) as BlobPart], encryptedName ? encryptedPlaceholder() : file.name, {
      type: "application/octet-stream",
    }),
  )
  form.set("encrypted", "true")
  form.set("mimeType", file.type || "application/octet-stream")
  if (width !== undefined) form.set("width", String(width))
  if (height !== undefined) form.set("height", String(height))
  if (durationMs !== undefined) form.set("durationMs", String(durationMs))
  if (encryptedName) form.set("encryptedName", encryptedName)
  if (file.lastModified) form.set("mtime", String(file.lastModified))

  const response = await fetch(`${API_URL}/api/v1/photos/assets`, {
    method: "POST",
    credentials: "include",
    body: form,
  })
  if (!response.ok) throw new Error(`Upload failed (${response.status})`)
  const { asset, mirrorNodeId } = (await response.json()) as {
    asset: Asset
    mirrorNodeId: string | null
  }

  // Wrap the content key to the asset and (so the Drive "Photos" mirror is a self-contained
  // encrypted file) to the mirror node too.
  await storeContentKey(asset.id, key)
  if (mirrorNodeId) await storeContentKey(mirrorNodeId, key)

  // Upload the encrypted thumbnail/poster to the Photos endpoint + the Drive mirror endpoint.
  if (thumbnail) {
    const encryptedThumb = secretboxSeal(thumbnail, key)
    await putThumbnail(`${API_URL}/api/v1/photos/assets/${asset.id}/thumbnail`, encryptedThumb)
    if (mirrorNodeId)
      await putThumbnail(`${API_URL}/api/v1/drive/nodes/${mirrorNodeId}/thumbnail`, encryptedThumb)
  }

  // Index for semantic search in the background (images only). Lazily loaded so the heavy
  // CLIP library only enters the bundle when E2E media actually uploads.
  if (file.type.startsWith("image/")) {
    void import("@lib/photoIndex")
      .then((index) => index.embedAndStore(asset.id, file))
      .catch(() => undefined)
  }

  return asset
}

/** @deprecated use uploadEncryptedMedia */
export const uploadEncryptedPhoto = uploadEncryptedMedia

/** Fetch + decrypt an encrypted asset's thumbnail into an object URL (or null). */
export const fetchDecryptedPhotoThumbnail = async (assetId: string): Promise<string | null> => {
  const key = await getDocContentKey(assetId)
  if (!key) return null
  const response = await fetch(`${API_URL}/api/v1/photos/assets/${assetId}/thumbnail`, {
    credentials: "include",
  })
  if (!response.ok) return null
  try {
    const plain = secretboxOpen(new Uint8Array(await response.arrayBuffer()), key)
    return URL.createObjectURL(new Blob([plain as BlobPart], { type: "image/jpeg" }))
  } catch {
    return null
  }
}

/** Decrypt an encrypted photo's original and save it to disk with the given filename. */
export const downloadDecryptedPhoto = async (assetId: string, filename: string): Promise<void> => {
  const url = await fetchDecryptedPhotoOriginal(assetId, "application/octet-stream")
  if (!url) throw new Error("Could not decrypt photo")
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/** Fetch + decrypt an encrypted asset's full image into an object URL (or null). */
export const fetchDecryptedPhotoOriginal = async (
  assetId: string,
  mimeType: string,
): Promise<string | null> => {
  const key = await getDocContentKey(assetId)
  if (!key) return null
  const response = await fetch(`${API_URL}/api/v1/photos/assets/${assetId}/original`, {
    credentials: "include",
  })
  if (!response.ok) return null
  try {
    const plain = secretboxOpen(new Uint8Array(await response.arrayBuffer()), key)
    return URL.createObjectURL(new Blob([plain as BlobPart], { type: mimeType || "image/jpeg" }))
  } catch {
    return null
  }
}
