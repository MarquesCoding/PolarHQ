import { apiFetch } from "@workspace/core/apiClient"
import type { ShareLink, ShareOptions } from "@lib/drive"
import { API_URL } from "@lib/env"

/** Create a public share link for a photo (uses its mirrored Drive node). */
export const sharePhoto = (assetId: string, options: ShareOptions = {}): Promise<ShareLink> =>
  apiFetch(`/api/v1/photos/assets/${assetId}/share`, {
    method: "POST",
    body: JSON.stringify(options),
  })

export type AssetStatus = "uploading" | "processing" | "ready" | "failed"

export interface AssetExif {
  make?: string
  model?: string
  lens?: string
  iso?: number
  fNumber?: number
  exposureTime?: number
  focalLength?: number
  focalLengthIn35mm?: number
  orientation?: number
  flash?: string | number
  exposureProgram?: string | number
  meteringMode?: string | number
  whiteBalance?: string | number
  exposureCompensation?: number
  software?: string
}

export interface Asset {
  id: string
  ownerId: string
  originalFilename: string
  encrypted: boolean
  encryptedName: string | null
  encryptedLocation: string | null
  encryptedExif: string | null
  mimeType: string
  type: "image" | "video" | "audio"
  width: number | null
  height: number | null
  sizeBytes: number
  durationMs: number | null
  status: AssetStatus
  takenAt: string | null
  createdAt: string
  latitude: number | null
  longitude: number | null
  cameraMake: string | null
  cameraModel: string | null
  exif: AssetExif | null
  isFavorite: boolean
  thumbnailUrl: string | null
  previewUrl: string | null
  videoUrl: string | null
  motion: boolean
}

/** Lightweight asset for the grid/timeline (the heavy detail fields live on the full Asset). */
export interface GridAsset {
  id: string
  originalFilename: string
  encrypted: boolean
  encryptedName: string | null
  mimeType: string
  type: "image" | "video" | "audio"
  status: AssetStatus
  sizeBytes: number
  width: number | null
  height: number | null
  durationMs: number | null
  takenAt: string | null
  createdAt: string
  isFavorite: boolean
  thumbnailUrl: string | null
  previewUrl: string | null
  videoUrl: string | null
  motion: boolean
  stackId: string | null
  stackCount: number
}

export interface TimelinePage {
  assets: GridAsset[]
  nextCursor: string | null
}

export type AssetView = "library" | "favourites" | "trash"

export interface AssetQuery {
  view?: AssetView
  album?: string
  tag?: string
  cursor?: string
}

export const fetchAsset = (id: string): Promise<{ asset: Asset }> =>
  apiFetch(`/api/v1/photos/assets/${id}`)

export const fetchAssets = (query: AssetQuery = {}): Promise<TimelinePage> => {
  const params = new URLSearchParams({ limit: "200" })
  if (query.view) params.set("view", query.view)
  if (query.album) params.set("album", query.album)
  if (query.tag) params.set("tag", query.tag)
  if (query.cursor) params.set("cursor", query.cursor)
  return apiFetch<TimelinePage>(`/api/v1/photos/assets?${params.toString()}`)
}

export interface UploadResult {
  asset: Asset
  deduped: boolean
}

/** Upload a single file as multipart form data (keeps the multipart boundary). */
export const uploadAsset = async (file: File): Promise<UploadResult> => {
  const body = new FormData()
  body.set("file", file)
  const response = await fetch(`${API_URL}/api/v1/photos/assets`, {
    method: "POST",
    credentials: "include",
    body,
  })
  if (!response.ok) throw new Error(`Upload failed (${response.status})`)
  return response.json() as Promise<UploadResult>
}

export interface Album {
  id: string
  name: string
  description: string | null
  assetCount: number
  coverThumbnailUrl: string | null
  coverAssetId: string | null
  coverEncrypted: boolean
  createdAt: string
  updatedAt: string
}

export interface AlbumDetail {
  album: {
    id: string
    name: string
    description: string | null
    coverAssetId: string | null
    createdAt: string
    updatedAt: string
  }
  assets: GridAsset[]
}

export const fetchAlbums = (): Promise<Album[]> =>
  apiFetch<{ albums: Album[] }>("/api/v1/photos/albums").then((response) => response.albums)

export const fetchAlbum = (id: string): Promise<AlbumDetail> =>
  apiFetch<AlbumDetail>(`/api/v1/photos/albums/${id}`)

export const createAlbum = (name: string, description?: string) =>
  apiFetch<{ album: { id: string; name: string } }>("/api/v1/photos/albums", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  }).then((response) => response.album)

export const addToAlbum = (albumId: string, assetIds: string[]) =>
  apiFetch(`/api/v1/photos/albums/${albumId}/assets`, {
    method: "POST",
    body: JSON.stringify({ assetIds }),
  })

export const removeFromAlbum = (albumId: string, assetIds: string[]) =>
  apiFetch(`/api/v1/photos/albums/${albumId}/assets`, {
    method: "DELETE",
    body: JSON.stringify({ assetIds }),
  })

export const deleteAlbum = (id: string) =>
  apiFetch(`/api/v1/photos/albums/${id}`, { method: "DELETE" })

export interface Tag {
  id: string
  name: string
  count: number
}

export const fetchTags = (): Promise<Tag[]> =>
  apiFetch<{ tags: Tag[] }>("/api/v1/photos/tags").then((response) => response.tags)

export const createTag = (name: string) =>
  apiFetch<{ tag: { id: string; name: string } }>("/api/v1/photos/tags", {
    method: "POST",
    body: JSON.stringify({ name }),
  }).then((response) => response.tag)

export const tagAssets = (tagId: string, assetIds: string[]) =>
  apiFetch(`/api/v1/photos/tags/${tagId}/assets`, {
    method: "POST",
    body: JSON.stringify({ assetIds }),
  })

export const deleteTag = (id: string) => apiFetch(`/api/v1/photos/tags/${id}`, { method: "DELETE" })

export const favoriteAssets = (assetIds: string[], favorite: boolean) =>
  apiFetch("/api/v1/photos/assets/actions/favorite", {
    method: "POST",
    body: JSON.stringify({ assetIds, favorite }),
  })

export const trashAssets = (assetIds: string[]) =>
  apiFetch("/api/v1/photos/assets/actions/trash", {
    method: "POST",
    body: JSON.stringify({ assetIds }),
  })

export const restoreAssets = (assetIds: string[]) =>
  apiFetch("/api/v1/photos/assets/actions/restore", {
    method: "POST",
    body: JSON.stringify({ assetIds }),
  })

export const deleteAssets = (assetIds: string[]) =>
  apiFetch("/api/v1/photos/assets/actions/delete", {
    method: "POST",
    body: JSON.stringify({ assetIds }),
  })

export const emptyTrash = () =>
  apiFetch("/api/v1/photos/assets/actions/empty-trash", { method: "POST" })

export interface StackResult {
  stackId: string
  primaryId: string
  count: number
}

export const stackAssets = (assetIds: string[]): Promise<StackResult> =>
  apiFetch("/api/v1/photos/assets/actions/stack", {
    method: "POST",
    body: JSON.stringify({ assetIds }),
  })

export const unstackAssets = (stackId: string) =>
  apiFetch("/api/v1/photos/assets/actions/unstack", {
    method: "POST",
    body: JSON.stringify({ stackId }),
  })

export const setStackCover = (assetId: string) =>
  apiFetch("/api/v1/photos/assets/actions/stack-cover", {
    method: "POST",
    body: JSON.stringify({ assetId }),
  })

export const fetchStackMembers = (stackId: string): Promise<{ assets: GridAsset[] }> =>
  apiFetch(`/api/v1/photos/stacks/${stackId}`)

export interface ProcessingAsset {
  id: string
  originalFilename: string
}

export const fetchProcessing = (): Promise<{ assets: ProcessingAsset[] }> =>
  apiFetch("/api/v1/photos/assets/processing")

/** Authenticated streaming URL for an asset's original file (used for audio playback). */
export const assetOriginalUrl = (id: string): string =>
  `${API_URL}/api/v1/photos/assets/${id}/original`

export interface Usage {
  usedBytes: number
  quotaBytes: number | null
}

export const fetchUsage = (): Promise<Usage> => apiFetch<Usage>("/api/v1/photos/usage")
