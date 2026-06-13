import { config } from "@polarhq/config"
import type { Asset } from "./service"

export interface AssetDto extends Asset {
  thumbnailUrl: string | null
  previewUrl: string | null
  videoUrl: string | null
  motion: boolean
}

const base = `${config.api.url}/api/v1/photos/assets`

/**
 * Media is served through the authenticated, ownership-checked API rather than
 * via direct (presigned) storage URLs — a presigned URL is a bearer capability
 * that grants anyone with the link access to a private object. Returning API
 * routes keeps every byte gated by the session + asset ownership.
 */
export const serializeAsset = async (asset: Asset): Promise<AssetDto> => ({
  ...asset,
  thumbnailUrl: asset.thumbnailKey ? `${base}/${asset.id}/thumbnail` : null,
  previewUrl: asset.previewKey ? `${base}/${asset.id}/preview` : null,
  videoUrl: asset.type === "video" ? `${base}/${asset.id}/video` : null,
  motion: Boolean(asset.motionKey),
})

export const serializeAssets = (assets: Asset[]): Promise<AssetDto[]> =>
  Promise.all(assets.map(serializeAsset))

/**
 * Lightweight asset for grid/timeline rendering — everything the justified
 * layout, tiles and lightbox need, minus the heavy detail fields (exif,
 * mime/size, camera, geo) which the info panel fetches per-asset on demand.
 * Keeps the in-memory feed small even for very large libraries.
 */
export interface GridAssetDto {
  id: string
  originalFilename: string
  encrypted: boolean
  encryptedName: string | null
  mimeType: string
  type: Asset["type"]
  status: Asset["status"]
  sizeBytes: number
  width: number | null
  height: number | null
  durationMs: number | null
  takenAt: Asset["takenAt"]
  createdAt: Asset["createdAt"]
  isFavorite: boolean
  thumbnailUrl: string | null
  previewUrl: string | null
  videoUrl: string | null
  motion: boolean
  stackId: string | null
  stackCount: number
}

export const serializeGridAsset = (asset: Asset, stackCount = 0): GridAssetDto => ({
  id: asset.id,
  originalFilename: asset.originalFilename,
  encrypted: asset.encrypted,
  encryptedName: asset.encryptedName,
  mimeType: asset.mimeType,
  type: asset.type,
  status: asset.status,
  sizeBytes: asset.sizeBytes,
  width: asset.width,
  height: asset.height,
  durationMs: asset.durationMs,
  takenAt: asset.takenAt,
  createdAt: asset.createdAt,
  isFavorite: asset.isFavorite,
  thumbnailUrl: asset.thumbnailKey ? `${base}/${asset.id}/thumbnail` : null,
  previewUrl: asset.previewKey ? `${base}/${asset.id}/preview` : null,
  videoUrl: asset.type === "video" ? `${base}/${asset.id}/video` : null,
  motion: Boolean(asset.motionKey),
  stackId: asset.stackId,
  stackCount,
})

export const serializeGridAssets = (
  assets: Asset[],
  stackCounts?: Map<string, number>,
): GridAssetDto[] =>
  assets.map((asset) =>
    serializeGridAsset(asset, asset.stackId ? (stackCounts?.get(asset.stackId) ?? 0) : 0),
  )
