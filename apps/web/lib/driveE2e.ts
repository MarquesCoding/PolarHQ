"use client"

import { apiFetch } from "@lib/apiClient"
import {
  STREAM_CHUNK_SIZE,
  type StreamOpener,
  isStreamBlob,
  secretboxOpen,
  secretboxSeal,
  secretstreamInit,
  secretstreamOpenAll,
  secretstreamOpenInit,
  streamCipherChunkSize,
  streamPrefixSize,
} from "@lib/crypto"
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

const concatBytes = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
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
    const chunks = Math.max(1, Math.ceil(file.size / STREAM_CHUNK_SIZE))
    const start = performance.now()
    let sent = 0
    for (let index = 0; index < chunks; index += 1) {
      const offset = index * STREAM_CHUNK_SIZE
      const slice = file.slice(offset, Math.min(offset + STREAM_CHUNK_SIZE, file.size))
      const plain = new Uint8Array(await slice.arrayBuffer())
      const sealed = sealer.seal(plain, index === chunks - 1)
      const body = index === 0 ? concatBytes(sealer.prefix, sealed) : sealed
      await apiFetch(`/api/v1/drive/nodes/upload/${sessionId}/part?part=${index + 1}`, {
        method: "POST",
        body: body as BodyInit,
        headers: { "content-type": "application/octet-stream" },
      })
      sent += slice.size
      const elapsed = (performance.now() - start) / 1000
      options?.onProgress?.({
        loaded: sent,
        total: file.size,
        speed: elapsed > 0 ? sent / elapsed : 0,
      })
    }
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

/** Download a Drive file, transparently decrypting it first if it's encrypted. */
interface SaveWritable {
  write: (data: Uint8Array) => Promise<void>
  close: () => Promise<void>
  abort?: (reason?: unknown) => Promise<void>
}

interface SaveCapableWindow {
  showSaveFilePicker?: (options?: {
    suggestedName?: string
  }) => Promise<{ createWritable: () => Promise<SaveWritable> }>
}

const saveCapable = (): SaveCapableWindow => window as unknown as SaveCapableWindow

/** Whether this browser can stream a download straight to disk (File System Access API). */
export const supportsStreamingDownload = (): boolean =>
  typeof saveCapable().showSaveFilePicker === "function"

/**
 * Stream-download a large encrypted Drive file straight to disk, decrypting chunk-by-chunk so the
 * browser never holds the whole plaintext in memory. Returns `true` when it handled the download
 * (including a user-cancelled save dialog), `false` to fall back to the in-memory path, and throws
 * on a mid-stream failure (the partial file is discarded).
 */
export const downloadEncryptedDriveFileStreaming = async (
  node: DriveNode,
  onProgress?: (progress: UploadProgress) => void,
): Promise<boolean> => {
  if (!node.encrypted || !node.downloadUrl || !supportsStreamingDownload()) return false
  const key = await getDocContentKey(node.id)
  if (!key) return false

  let writable: SaveWritable
  try {
    const handle = await saveCapable().showSaveFilePicker!({ suggestedName: node.name })
    writable = await handle.createWritable()
  } catch {
    return true
  }

  try {
    const response = await fetch(node.downloadUrl, { credentials: "include" })
    if (!response.ok || !response.body) {
      await writable.abort?.()
      return false
    }
    const total = Number(response.headers.get("content-length")) || node.sizeBytes || 0
    let loaded = 0
    const startTime = performance.now()
    const reader = response.body.getReader()
    const prefixSize = streamPrefixSize()
    const cipherChunk = streamCipherChunkSize()
    const pending: Uint8Array[] = []
    let pendingLen = 0
    const take = (count: number): Uint8Array => {
      const out = new Uint8Array(count)
      let filled = 0
      while (filled < count) {
        const head = pending[0]!
        const need = count - filled
        if (head.length <= need) {
          out.set(head, filled)
          filled += head.length
          pending.shift()
        } else {
          out.set(head.subarray(0, need), filled)
          filled += need
          pending[0] = head.subarray(need)
        }
      }
      pendingLen -= count
      return out
    }

    let opener: StreamOpener | null = null
    let done = false
    for (;;) {
      const { value, done: streamDone } = await reader.read()
      if (value) {
        pending.push(value)
        pendingLen += value.length
        loaded += value.length
        const elapsed = (performance.now() - startTime) / 1000
        onProgress?.({ loaded, total, speed: elapsed > 0 ? loaded / elapsed : 0 })
      }
      if (!opener && pendingLen >= prefixSize) {
        const prefix = take(prefixSize)
        if (!isStreamBlob(prefix)) {
          await writable.abort?.()
          return false
        }
        opener = secretstreamOpenInit(prefix, key)
      }
      while (opener && !done && (pendingLen >= cipherChunk || (streamDone && pendingLen > 0))) {
        const size = Math.min(cipherChunk, pendingLen)
        if (size < cipherChunk && !streamDone) break
        const { message, final } = opener.open(take(size))
        await writable.write(message)
        if (final) done = true
      }
      if (streamDone || done) break
    }
    await writable.close()
    return true
  } catch (error) {
    await writable.abort?.().catch(() => undefined)
    throw error
  }
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
