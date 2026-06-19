"use client"

import { apiFetch } from "@lib/apiClient"
import { uploadStreamingParts } from "@lib/chunkedUpload"
import {
  isStreamBlob,
  secretboxOpen,
  secretboxSeal,
  secretstreamInit,
  secretstreamOpenAll,
} from "@workspace/core/crypto"
import { streamDecryptToDisk, supportsStreamingDownload } from "@lib/streamDownload"
import { type DriveNode, decryptNodeName } from "@lib/drive"
import {
  createContentKey,
  encryptName,
  encryptedPlaceholder,
  getDocContentKey,
  storeContentKey,
} from "@lib/e2e"
import { API_URL } from "@lib/env"
import { generateImageThumbnail } from "@lib/thumbnails"
import { type UploadOptions, type UploadProgress, postFormWithProgress } from "@lib/xhrUpload"

/**
 * Upload a file end-to-end encrypted: encrypt the bytes with a fresh content key,
 * store the ciphertext as a Drive file, wrap the key to the owner, and (for images)
 * generate + upload an encrypted thumbnail. The server only ever sees ciphertext.
 */
export const uploadEncryptedDriveFile = async (
  parentId: string | null,
  file: File,
  options?: UploadOptions,
): Promise<DriveNode> => {
  const key = createContentKey()
  const original = new Uint8Array(await file.arrayBuffer())

  const encryptedName = encryptName(file.name)
  const form = new FormData()
  form.set(
    "file",
    new File([secretboxSeal(original, key) as BlobPart], encryptedName ? encryptedPlaceholder() : file.name, {
      type: "application/octet-stream",
    }),
  )
  form.set("mimeType", file.type || "application/octet-stream")
  form.set("encrypted", "true")
  if (encryptedName) form.set("encryptedName", encryptedName)
  if (parentId) form.set("parentId", parentId)
  if (file.lastModified) form.set("mtime", String(file.lastModified))

  const { node } = await postFormWithProgress<{ node: DriveNode }>(
    `${API_URL}/api/v1/drive/nodes/upload`,
    form,
    options,
  )

  await storeContentKey(node.id, key)

  if (file.type.startsWith("image/")) {
    const thumbnail = await generateImageThumbnail(file).catch(() => null)
    if (thumbnail) {
      await fetch(`${API_URL}/api/v1/drive/nodes/${node.id}/thumbnail`, {
        method: "PUT",
        credentials: "include",
        headers: { "content-type": "application/octet-stream" },
        body: secretboxSeal(thumbnail, key) as BodyInit,
      })
    }
  }

  return { ...decryptNodeName(node), encrypted: true }
}

/** Files at or above this size upload in streaming chunks instead of one in-memory blob. */
export const CHUNKED_UPLOAD_THRESHOLD = 64 * 1024 * 1024

/**
 * Upload a large file end-to-end encrypted in streaming chunks, so the browser never holds the
 * whole file or ciphertext in memory. Each STREAM_CHUNK_SIZE slice is secretstream-sealed and sent
 * as one multipart part (the first carries the magic+header prefix); the server assembles them.
 */
export const uploadEncryptedDriveFileChunked = async (
  parentId: string | null,
  file: File,
  options?: UploadOptions,
): Promise<DriveNode> => {
  const key = createContentKey()
  const sealer = secretstreamInit(key)
  const encryptedName = encryptName(file.name)

  const { sessionId } = await apiFetch<{ sessionId: string }>(
    "/api/v1/drive/nodes/upload/initiate",
    {
      method: "POST",
      body: JSON.stringify({
        parentId,
        filename: encryptedName ? encryptedPlaceholder() : file.name,
        mimeType: file.type || "application/octet-stream",
        encryptedName: encryptedName ?? undefined,
        totalSize: file.size,
      }),
    },
  )

  try {
    await uploadStreamingParts(
      file,
      sealer,
      (partNumber) => `/api/v1/drive/nodes/upload/${sessionId}/part?part=${partNumber}`,
      options,
    )
    const { node } = await apiFetch<{ node: DriveNode }>(
      `/api/v1/drive/nodes/upload/${sessionId}/complete`,
      { method: "POST" },
    )
    await storeContentKey(node.id, key)
    return { ...decryptNodeName(node), encrypted: true }
  } catch (error) {
    await apiFetch(`/api/v1/drive/nodes/upload/${sessionId}/abort`, { method: "POST" }).catch(
      () => undefined,
    )
    throw error
  }
}

/** Fetch + decrypt an encrypted node's thumbnail into an object URL (or null). */
export const fetchDecryptedThumbnail = async (nodeId: string): Promise<string | null> => {
  const key = await getDocContentKey(nodeId)
  if (!key) return null
  const response = await fetch(`${API_URL}/api/v1/drive/nodes/${nodeId}/thumbnail`, {
    credentials: "include",
  })
  if (!response.ok) return null
  try {
    const plain = secretboxOpen(new Uint8Array(await response.arrayBuffer()), key)
    return URL.createObjectURL(new Blob([plain as BlobPart]))
  } catch {
    return null
  }
}

export { supportsStreamingDownload }

/**
 * Stream-download a large encrypted Drive file straight to disk (returns false to fall back to the
 * in-memory path). See `streamDecryptToDisk` for the semantics.
 */
export const downloadEncryptedDriveFileStreaming = async (
  node: DriveNode,
  onProgress?: (progress: UploadProgress) => void,
): Promise<boolean> => {
  if (!node.encrypted || !node.downloadUrl || !supportsStreamingDownload()) return false
  const key = await getDocContentKey(node.id)
  if (!key) return false
  return streamDecryptToDisk(node.downloadUrl, key, node.name, node.sizeBytes ?? 0, onProgress)
}

export const downloadDriveFile = async (
  node: DriveNode,
  onProgress?: (progress: UploadProgress) => void,
): Promise<void> => {
  if (node.kind !== "file" || !node.downloadUrl) return
  if (node.encrypted && (await downloadEncryptedDriveFileStreaming(node, onProgress))) return
  let href = node.downloadUrl
  let revoke = false
  if (node.encrypted) {
    const url = await fetchDecryptedFile(node.id, node.downloadUrl, node.mimeType)
    if (!url) return
    href = url
    revoke = true
  }
  const anchor = document.createElement("a")
  anchor.href = href
  anchor.download = node.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 2000)
}

/** Fetch + decrypt an encrypted node's full content into an object URL (or null). */
export const fetchDecryptedFile = async (
  nodeId: string,
  downloadUrl: string,
  mimeType: string | null,
): Promise<string | null> => {
  const key = await getDocContentKey(nodeId)
  if (!key) return null
  const response = await fetch(downloadUrl, { credentials: "include" })
  if (!response.ok) return null
  try {
    const bytes = new Uint8Array(await response.arrayBuffer())
    const plain = isStreamBlob(bytes) ? secretstreamOpenAll(bytes, key) : secretboxOpen(bytes, key)
    return URL.createObjectURL(new Blob([plain as BlobPart], { type: mimeType ?? undefined }))
  } catch {
    return null
  }
}
