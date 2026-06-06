"use client"

import { secretboxOpen, secretboxSeal } from "@lib/crypto"
import {
  createContentKey,
  encryptName,
  encryptedPlaceholder,
  getDocContentKey,
  storeContentKey,
} from "@lib/e2e"
import { API_URL } from "@lib/env"
import type { Asset } from "@lib/photos"
import { analyzeImage } from "@lib/thumbnails"

/**
 * Upload an image end-to-end encrypted, mirroring the Drive model: encrypt the original
 * with a fresh content key, generate + encrypt a thumbnail client-side, and send the
 * dimensions/takenAt/filename the grid needs (the server can't read EXIF on ciphertext).
 * The server stores only opaque bytes and runs no media processing.
 */
export const uploadEncryptedPhoto = async (file: File): Promise<Asset> => {
  const key = createContentKey()
  const original = new Uint8Array(await file.arrayBuffer())
  const { thumbnail, width, height } = await analyzeImage(file)

  const encryptedName = encryptName(file.name)
  const form = new FormData()
  form.set(
    "file",
    new File([secretboxSeal(original, key) as BlobPart], encryptedName ? encryptedPlaceholder() : file.name, {
      type: "application/octet-stream",
    }),
  )
  form.set("encrypted", "true")
  form.set("mimeType", file.type || "image/jpeg")
  form.set("width", String(width))
  form.set("height", String(height))
  if (encryptedName) form.set("encryptedName", encryptedName)
  if (file.lastModified) form.set("mtime", String(file.lastModified))

  const response = await fetch(`${API_URL}/api/v1/photos/assets`, {
    method: "POST",
    credentials: "include",
    body: form,
  })
  if (!response.ok) throw new Error(`Upload failed (${response.status})`)
  const { asset } = (await response.json()) as { asset: Asset }

  await storeContentKey(asset.id, key)

  // Encrypt + upload the thumbnail under the same content key.
  await fetch(`${API_URL}/api/v1/photos/assets/${asset.id}/thumbnail`, {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/octet-stream" },
    body: secretboxSeal(thumbnail, key) as BodyInit,
  })

  return asset
}

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
