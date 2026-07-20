import type { DriveNode, StorageKind } from "@workspace/core/drive"

const ARCHIVE = /\.(zip|tar|gz|tgz|rar|7z|bz2|xz|dmg)$/i

/** Classify a Drive file into a storage kind (image/video/audio/document/archive/other) by its
 *  mime type and name. Shared by the details panels and the toolbar filter. */
export const storageKind = (node: DriveNode): StorageKind => {
  const mime = node.mimeType ?? ""
  const name = node.name.toLowerCase()
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  if (
    mime === "application/pdf" ||
    /(word|presentation|spreadsheet|^text\/|vnd\.orbit|officedocument|oasis|msword|json)/.test(mime)
  )
    return "document"
  if (ARCHIVE.test(name) || /(zip|tar|gzip|x-7z|x-rar|x-bzip)/.test(mime)) return "archive"
  return "other"
}

export const STORAGE_KINDS: StorageKind[] = [
  "image",
  "video",
  "audio",
  "document",
  "archive",
  "other",
]
