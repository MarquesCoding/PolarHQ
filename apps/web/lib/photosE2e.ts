"use client"

import { apiFetch } from "@lib/apiClient"
import {
  STREAM_CHUNK_SIZE,
  isStreamBlob,
  secretboxOpen,
  secretboxSeal,
  secretstreamInit,
  secretstreamOpenAll,
} from "@lib/crypto"
import { CHUNKED_UPLOAD_THRESHOLD } from "@lib/driveE2e"
import { streamDecryptToDisk, supportsStreamingDownload } from "@lib/streamDownload"
import {
  createContentKey,
  decryptName,
  encryptName,
  encryptWithMetaKey,
  encryptedPlaceholder,
  getDocContentKey,
  storeContentKey,
} from "@lib/e2e"
import { API_URL } from "@lib/env"
import { extractMotionVideo } from "@lib/motionPhoto"
import { type Asset, type GridAsset, fetchStackMembers } from "@lib/photos"
import { analyzeAudio, analyzeImage, analyzeVideo } from "@lib/thumbnails"
import {
  type UploadOptions,
  type UploadProgress,
  postFormWithProgress,
  retryOnTransient,
} from "@lib/xhrUpload"
import exifr from "exifr"

const encoder = new TextEncoder()

/** Extract GPS from an image and encrypt it under the account metadata key (null if none). */
export const encryptedGpsFor = async (file: File): Promise<string | null> => {
  try {
    const gps = await exifr.gps(file)
    if (!gps || typeof gps.latitude !== "number" || typeof gps.longitude !== "number") return null
    return encryptWithMetaKey(encoder.encode(JSON.stringify({ lat: gps.latitude, lng: gps.longitude })))
  } catch {
    return null
  }
}

export interface ExtractedMetadata {
  encryptedLocation: string | null
  encryptedExif: string | null
  takenAtMs: number | null
}

const EMPTY_METADATA: ExtractedMetadata = {
  encryptedLocation: null,
  encryptedExif: null,
  takenAtMs: null,
}

/**
 * Parse an image's EXIF once and return its location + camera metadata encrypted under the
 * account metadata key, plus the real capture date (DateTimeOriginal) so the timeline uses it
 * instead of the file's mtime. Everything is extracted client-side because E2E uploads bypass
 * the server's media pipeline.
 */
export const extractEncryptedMetadata = async (file: File): Promise<ExtractedMetadata> => {
  try {
    const data = await exifr.parse(file, { tiff: true, exif: true, gps: true }).catch(() => null)
    if (!data) return EMPTY_METADATA

    const encryptedLocation =
      typeof data.latitude === "number" && typeof data.longitude === "number"
        ? encryptWithMetaKey(encoder.encode(JSON.stringify({ lat: data.latitude, lng: data.longitude })))
        : null

    const exif = {
      make: data.Make,
      model: data.Model,
      lens: data.LensModel,
      iso: data.ISO,
      fNumber: data.FNumber,
      exposureTime: data.ExposureTime,
      focalLength: data.FocalLength,
      focalLengthIn35mm: data.FocalLengthIn35mmFormat,
      exposureCompensation: data.ExposureCompensationValue ?? data.ExposureCompensation,
      software: data.Software,
    }
    const hasExif = Object.values(exif).some((value) => value !== undefined && value !== null)
    const encryptedExif = hasExif
      ? encryptWithMetaKey(encoder.encode(JSON.stringify(exif)))
      : null

    const taken = data.DateTimeOriginal ?? data.CreateDate
    const takenAtMs = taken instanceof Date && !Number.isNaN(taken.getTime()) ? taken.getTime() : null

    return { encryptedLocation, encryptedExif, takenAtMs }
  } catch {
    return EMPTY_METADATA
  }
}

const isHeic = (file: File): boolean =>
  /image\/(heic|heif)/i.test(file.type) || /\.hei[cf]$/i.test(file.name)

/** Decode a HEIC/HEIF image to a JPEG File in the browser (libheif via heic2any). */
const convertHeicToJpeg = async (file: File): Promise<File | null> => {
  try {
    const { default: heic2any } = await import("heic2any")
    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 })
    const blob = Array.isArray(result) ? result[0] : result
    if (!blob) return null
    return new File([blob], file.name.replace(/\.hei[cf]$/i, ".jpg"), { type: "image/jpeg" })
  } catch {
    return null
  }
}

/** Map an asset to a download item, resolving the encrypted filename for the saved file. */
export const downloadItemFor = (
  asset: Pick<GridAsset, "id" | "encrypted" | "encryptedName" | "originalFilename" | "sizeBytes">,
): { id: string; name: string; encrypted: boolean; size: number } => ({
  id: asset.id,
  name: (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename,
  encrypted: asset.encrypted,
  size: asset.sizeBytes,
})

type StackableAsset = Pick<
  GridAsset,
  "id" | "encrypted" | "encryptedName" | "originalFilename" | "sizeBytes" | "stackId" | "stackCount"
>

/**
 * Expand a selection into download items, replacing each stack cover (a burst, an edited
 * before/after, …) with all of its frames. Non-stacked assets pass through unchanged. Members
 * are fetched per stack and de-duplicated so overlapping selections don't download twice.
 */
export const expandStacksToDownloadItems = async (
  assets: StackableAsset[],
): Promise<{ id: string; name: string; encrypted: boolean; size: number }[]> => {
  const items: { id: string; name: string; encrypted: boolean; size: number }[] = []
  const seen = new Set<string>()
  const push = (asset: Parameters<typeof downloadItemFor>[0]) => {
    if (seen.has(asset.id)) return
    seen.add(asset.id)
    items.push(downloadItemFor(asset))
  }
  for (const asset of assets) {
    if (asset.stackId && asset.stackCount > 1) {
      try {
        const { assets: members } = await fetchStackMembers(asset.stackId)
        for (const member of members) push(member)
        continue
      } catch {
        /* fall back to just the cover if members can't be fetched */
      }
    }
    push(asset)
  }
  return items
}

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
interface AnalyzedMedia {
  source: File
  thumbnail: Uint8Array | null
  width?: number
  height?: number
  durationMs?: number
  metadata: ExtractedMetadata
}

/** Decode/transcode + extract the thumbnail, dimensions, duration and EXIF for a media file. */
const analyzeMedia = async (file: File): Promise<AnalyzedMedia> => {
  const source = isHeic(file) ? ((await convertHeicToJpeg(file)) ?? file) : file
  let thumbnail: Uint8Array | null = null
  let width: number | undefined
  let height: number | undefined
  let durationMs: number | undefined
  let metadata: ExtractedMetadata = EMPTY_METADATA
  if (source.type.startsWith("video/")) {
    const v = await analyzeVideo(source).catch(() => null)
    if (v) ({ poster: thumbnail, width, height, durationMs } = v)
  } else if (source.type.startsWith("audio/")) {
    durationMs = await analyzeAudio(source).catch(() => 0)
  } else {
    const i = await analyzeImage(source)
    thumbnail = i.thumbnail
    width = i.width
    height = i.height
    metadata = await extractEncryptedMetadata(file)
  }
  return { source, thumbnail, width, height, durationMs, metadata }
}

/** Store the content key, upload the encrypted thumbnail/poster + motion clip, and index images. */
const attachAssetExtras = async (
  file: File,
  source: File,
  asset: Asset,
  mirrorNodeId: string | null,
  key: Uint8Array,
  thumbnail: Uint8Array | null,
  motionFile?: File,
): Promise<void> => {
  await storeContentKey(asset.id, key)
  if (mirrorNodeId) await storeContentKey(mirrorNodeId, key)

  if (thumbnail) {
    const encryptedThumb = secretboxSeal(thumbnail, key)
    await putThumbnail(`${API_URL}/api/v1/photos/assets/${asset.id}/thumbnail`, encryptedThumb)
    if (mirrorNodeId)
      await putThumbnail(`${API_URL}/api/v1/drive/nodes/${mirrorNodeId}/thumbnail`, encryptedThumb)
  }

  if (source.type.startsWith("image/")) {
    const motionBytes = motionFile
      ? new Uint8Array(await motionFile.arrayBuffer())
      : await extractMotionVideo(file).catch(() => null)
    if (motionBytes) {
      await putThumbnail(
        `${API_URL}/api/v1/photos/assets/${asset.id}/motion`,
        secretboxSeal(motionBytes, key),
      ).catch(() => undefined)
    }
    void import("@lib/photoIndex")
      .then((index) => index.embedAndStore(asset.id, source))
      .catch(() => undefined)
  }
}

const concatBytes = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

export const uploadEncryptedMedia = async (
  file: File,
  motionFile?: File,
  options?: UploadOptions,
): Promise<Asset> => {
  const key = createContentKey()
  const { source, thumbnail, width, height, durationMs, metadata } = await analyzeMedia(file)
  const original = new Uint8Array(await source.arrayBuffer())

  const encryptedName = encryptName(source.name)
  const form = new FormData()
  form.set(
    "file",
    new File([secretboxSeal(original, key) as BlobPart], encryptedName ? encryptedPlaceholder() : source.name, {
      type: "application/octet-stream",
    }),
  )
  form.set("encrypted", "true")
  form.set("mimeType", source.type || "application/octet-stream")
  if (width !== undefined) form.set("width", String(width))
  if (height !== undefined) form.set("height", String(height))
  if (durationMs !== undefined) form.set("durationMs", String(durationMs))
  if (encryptedName) form.set("encryptedName", encryptedName)
  if (metadata.encryptedLocation) form.set("encryptedLocation", metadata.encryptedLocation)
  if (metadata.encryptedExif) form.set("encryptedExif", metadata.encryptedExif)
  const takenAtMs = metadata.takenAtMs ?? (file.lastModified || undefined)
  if (takenAtMs) form.set("mtime", String(takenAtMs))

  const { asset, mirrorNodeId } = await postFormWithProgress<{
    asset: Asset
    mirrorNodeId: string | null
  }>(`${API_URL}/api/v1/photos/assets`, form, options)

  await attachAssetExtras(file, source, asset, mirrorNodeId, key, thumbnail, motionFile)
  return asset
}

/**
 * Upload large media end-to-end encrypted in streaming chunks (mirrors the Drive path) so the
 * browser never holds the whole file/ciphertext in memory. Metadata (dimensions/duration/EXIF)
 * is sent at session start; the encrypted original streams as multipart parts.
 */
export const uploadEncryptedMediaChunked = async (
  file: File,
  motionFile?: File,
  options?: UploadOptions,
): Promise<Asset> => {
  const key = createContentKey()
  const { source, thumbnail, width, height, durationMs, metadata } = await analyzeMedia(file)
  const sealer = secretstreamInit(key)
  const encryptedName = encryptName(source.name)

  const { sessionId } = await apiFetch<{ sessionId: string; assetId: string }>(
    "/api/v1/photos/assets/upload/initiate",
    {
      method: "POST",
      body: JSON.stringify({
        mimeType: source.type || "application/octet-stream",
        totalSize: source.size,
        width: width ?? null,
        height: height ?? null,
        durationMs: durationMs ?? null,
        encryptedName: encryptedName ?? null,
        encryptedLocation: metadata.encryptedLocation ?? null,
        encryptedExif: metadata.encryptedExif ?? null,
        placeholderName: encryptedName ? encryptedPlaceholder() : source.name,
        takenAtMs: metadata.takenAtMs ?? (file.lastModified || null),
      }),
    },
  )

  try {
    const chunks = Math.max(1, Math.ceil(source.size / STREAM_CHUNK_SIZE))
    const start = performance.now()
    let sent = 0
    for (let index = 0; index < chunks; index += 1) {
      const offset = index * STREAM_CHUNK_SIZE
      const slice = source.slice(offset, Math.min(offset + STREAM_CHUNK_SIZE, source.size))
      const plain = new Uint8Array(await slice.arrayBuffer())
      const sealed = sealer.seal(plain, index === chunks - 1)
      const body = index === 0 ? concatBytes(sealer.prefix, sealed) : sealed
      await retryOnTransient(() =>
        apiFetch(`/api/v1/photos/assets/upload/${sessionId}/part?part=${index + 1}`, {
          method: "POST",
          body: body as BodyInit,
          headers: { "content-type": "application/octet-stream" },
        }),
      )
      sent += slice.size
      const elapsed = (performance.now() - start) / 1000
      options?.onProgress?.({
        loaded: sent,
        total: source.size,
        speed: elapsed > 0 ? sent / elapsed : 0,
      })
    }
    const { asset, mirrorNodeId } = await apiFetch<{
      asset: Asset
      mirrorNodeId: string | null
    }>(`/api/v1/photos/assets/upload/${sessionId}/complete`, { method: "POST" })
    await attachAssetExtras(file, source, asset, mirrorNodeId, key, thumbnail, motionFile)
    return asset
  } catch (error) {
    await apiFetch(`/api/v1/photos/assets/upload/${sessionId}/abort`, { method: "POST" }).catch(
      () => undefined,
    )
    throw error
  }
}

/** Fetch + decrypt an asset's motion-photo clip into an object URL (or null if it has none). */
export const fetchDecryptedMotionVideo = async (assetId: string): Promise<string | null> => {
  const key = await getDocContentKey(assetId)
  if (!key) return null
  const response = await fetch(`${API_URL}/api/v1/photos/assets/${assetId}/motion`, {
    credentials: "include",
  })
  if (!response.ok) return null
  try {
    const plain = secretboxOpen(new Uint8Array(await response.arrayBuffer()), key)
    return URL.createObjectURL(new Blob([plain as BlobPart], { type: "video/mp4" }))
  } catch {
    return null
  }
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

/**
 * Decrypt an encrypted photo's original and save it to disk. Large files (≥ the chunk threshold)
 * stream straight to disk so a multi-GB video never buffers in memory; smaller files use the
 * in-memory path (no save dialog — keeps batch downloads frictionless).
 */
export const downloadDecryptedPhoto = async (
  assetId: string,
  filename: string,
  sizeBytes = 0,
  onProgress?: (progress: UploadProgress) => void,
): Promise<void> => {
  if (sizeBytes >= CHUNKED_UPLOAD_THRESHOLD && supportsStreamingDownload()) {
    const key = await getDocContentKey(assetId)
    if (key) {
      const url = `${API_URL}/api/v1/photos/assets/${assetId}/original`
      if (await streamDecryptToDisk(url, key, filename, sizeBytes, onProgress)) return
    }
  }
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
    const bytes = new Uint8Array(await response.arrayBuffer())
    const plain = isStreamBlob(bytes) ? secretstreamOpenAll(bytes, key) : secretboxOpen(bytes, key)
    return URL.createObjectURL(new Blob([plain as BlobPart], { type: mimeType || "image/jpeg" }))
  } catch {
    return null
  }
}
