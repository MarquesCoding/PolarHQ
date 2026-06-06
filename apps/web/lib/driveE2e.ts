"use client"

import { secretboxOpen, secretboxSeal } from "@lib/crypto"
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

/**
 * Upload a file end-to-end encrypted: encrypt the bytes with a fresh content key,
 * store the ciphertext as a Drive file, wrap the key to the owner, and (for images)
 * generate + upload an encrypted thumbnail. The server only ever sees ciphertext.
 */
export const uploadEncryptedDriveFile = async (
  parentId: string | null,
  file: File,
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

  const response = await fetch(`${API_URL}/api/v1/drive/nodes/upload`, {
    method: "POST",
    credentials: "include",
    body: form,
  })
  if (!response.ok) throw new Error(`Upload failed (${response.status})`)
  const { node } = (await response.json()) as { node: DriveNode }

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
export const downloadDriveFile = async (node: DriveNode): Promise<void> => {
  if (node.kind !== "file" || !node.downloadUrl) return
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
    const plain = secretboxOpen(new Uint8Array(await response.arrayBuffer()), key)
    return URL.createObjectURL(new Blob([plain as BlobPart], { type: mimeType ?? undefined }))
  } catch {
    return null
  }
}
