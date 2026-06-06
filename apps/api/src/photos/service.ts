import { createHash } from "node:crypto"
import { extname } from "node:path"
import { createId } from "@paralleldrive/cuid2"
import { resolveLimit } from "@workspace/auth"
import { db, schema } from "@workspace/db"
import { enqueueProcessAsset } from "@workspace/jobs"
import { assetObjectKeys, storage } from "@workspace/storage"
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm"
import {
  ensurePhotosDriveNode,
  removeNodesForAssets,
  setNodesTrashedForAssets,
} from "../drive/service"

export type Asset = typeof schema.assets.$inferSelect

export interface IngestInput {
  ownerId: string
  filename: string
  mimeType: string
  bytes: Buffer
  clientModifiedAt?: Date
  /** When false, the asset is processed for thumbnails but kept out of the Photos library + mirror. */
  inLibrary?: boolean
}

export interface IngestResult {
  asset: Asset
  deduped: boolean
}

const sha256 = (bytes: Buffer): string => createHash("sha256").update(bytes).digest("hex")

/**
 * Ingest an uploaded file: dedup by per-owner content hash, store the original,
 * persist the asset row, and enqueue background processing.
 */
export const ingestUpload = async (input: IngestInput): Promise<IngestResult> => {
  const checksum = sha256(input.bytes)

  const existing = await db
    .select()
    .from(schema.assets)
    .where(and(eq(schema.assets.ownerId, input.ownerId), eq(schema.assets.checksum, checksum)))
    .limit(1)
  if (existing[0]) {
    if (input.inLibrary !== false)
      await ensurePhotosDriveNode(input.ownerId, existing[0]).catch(() => undefined)
    return { asset: existing[0], deduped: true }
  }

  const assetId = createId()
  const keys = assetObjectKeys(input.ownerId, assetId, extname(input.filename))
  await storage().put({ key: keys.original, body: input.bytes, contentType: input.mimeType })

  const type = input.mimeType.startsWith("video/")
    ? "video"
    : input.mimeType.startsWith("audio/")
      ? "audio"
      : "image"
  const inserted = await db
    .insert(schema.assets)
    .values({
      id: assetId,
      ownerId: input.ownerId,
      checksum,
      originalFilename: input.filename,
      mimeType: input.mimeType,
      type,
      sizeBytes: input.bytes.length,
      storageKey: keys.original,
      status: "processing",
      inLibrary: input.inLibrary ?? true,
      takenAt: input.clientModifiedAt ?? null,
    })
    .returning()

  const asset = inserted[0]
  if (!asset) throw new Error("Failed to insert asset")

  if (input.inLibrary !== false)
    await ensurePhotosDriveNode(input.ownerId, asset).catch(() => undefined)
  await enqueueProcessAsset({ assetId })
  return { asset, deduped: false }
}

export interface EncryptedIngestInput {
  ownerId: string
  /** Ciphertext of the original image. */
  bytes: Buffer
  mimeType: string
  width?: number
  height?: number
  takenAt?: Date
  /** Filename encrypted with the account metadata key (the plaintext column gets a placeholder). */
  encryptedName?: string | null
  placeholderName: string
}

/**
 * Ingest an end-to-end-encrypted image: the bytes are already ciphertext, so we store them
 * as-is and run NO media processing — the client owns the content key, thumbnail, and the
 * dimensions/takenAt the grid needs. The asset is `ready` immediately. No Drive mirror yet
 * (the encrypted-photo↔Drive key coupling is a separate piece of work).
 */
export const ingestEncryptedAsset = async (input: EncryptedIngestInput): Promise<Asset> => {
  const checksum = sha256(input.bytes)
  const assetId = createId()
  const keys = assetObjectKeys(input.ownerId, assetId, ".bin")
  await storage().put({
    key: keys.original,
    body: input.bytes,
    contentType: "application/octet-stream",
  })

  const inserted = await db
    .insert(schema.assets)
    .values({
      id: assetId,
      ownerId: input.ownerId,
      checksum,
      originalFilename: input.placeholderName,
      encryptedName: input.encryptedName ?? null,
      encrypted: true,
      mimeType: input.mimeType,
      type: "image",
      sizeBytes: input.bytes.length,
      width: input.width ?? null,
      height: input.height ?? null,
      storageKey: keys.original,
      status: "ready",
      takenAt: input.takenAt ?? null,
    })
    .returning()

  const asset = inserted[0]
  if (!asset) throw new Error("Failed to insert asset")
  return asset
}

/** Store a client-encrypted thumbnail for an asset and mark it displayable. */
export const setEncryptedThumbnail = async (
  ownerId: string,
  assetId: string,
  bytes: Buffer,
): Promise<boolean> => {
  const asset = await getAsset(ownerId, assetId)
  if (!asset) return false
  const key = assetObjectKeys(ownerId, assetId, ".bin").thumbnail
  await storage().put({ key, body: bytes, contentType: "application/octet-stream" })
  await db
    .update(schema.assets)
    .set({ thumbnailKey: key, updatedAt: new Date() })
    .where(eq(schema.assets.id, assetId))
  return true
}

export interface TimelinePage {
  assets: Asset[]
  nextCursor: string | null
}

export type AssetView = "library" | "favourites" | "trash"

export interface ListAssetsOptions {
  limit?: number
  cursor?: string
  view?: AssetView
  albumId?: string
  tagId?: string
}

const albumAssetIds = async (albumId: string): Promise<string[]> => {
  const rows = await db
    .select({ id: schema.albumAssets.assetId })
    .from(schema.albumAssets)
    .where(eq(schema.albumAssets.albumId, albumId))
  return rows.map((row) => row.id)
}

const tagAssetIds = async (tagId: string): Promise<string[]> => {
  const rows = await db
    .select({ id: schema.assetTags.assetId })
    .from(schema.assetTags)
    .where(eq(schema.assetTags.tagId, tagId))
  return rows.map((row) => row.id)
}

/** List an owner's assets with view/album/tag filters, newest first, paginated. */
export const listAssets = async (
  ownerId: string,
  options: ListAssetsOptions = {},
): Promise<TimelinePage> => {
  const limit = options.limit ?? 50
  const view = options.view ?? "library"
  const conditions = [
    eq(schema.assets.ownerId, ownerId),
    eq(schema.assets.inLibrary, true),
  ]

  if (view === "trash") {
    conditions.push(eq(schema.assets.isTrashed, true))
  } else {
    conditions.push(eq(schema.assets.isTrashed, false))
    if (view === "favourites") conditions.push(eq(schema.assets.isFavorite, true))
  }
  if (options.cursor) conditions.push(lt(schema.assets.createdAt, new Date(options.cursor)))

  if (options.albumId) {
    const ids = await albumAssetIds(options.albumId)
    if (ids.length === 0) return { assets: [], nextCursor: null }
    conditions.push(inArray(schema.assets.id, ids))
  }
  if (options.tagId) {
    const ids = await tagAssetIds(options.tagId)
    if (ids.length === 0) return { assets: [], nextCursor: null }
    conditions.push(inArray(schema.assets.id, ids))
  }

  const rows = await db
    .select()
    .from(schema.assets)
    .where(and(...conditions))
    .orderBy(desc(schema.assets.createdAt))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page[page.length - 1]
  const nextCursor = hasMore && last ? last.createdAt.toISOString() : null
  return { assets: page, nextCursor }
}

export const listTimeline = (ownerId: string, limit = 50, cursor?: string): Promise<TimelinePage> =>
  listAssets(ownerId, { limit, cursor, view: "library" })

export const getAsset = async (ownerId: string, assetId: string): Promise<Asset | null> => {
  const rows = await db
    .select()
    .from(schema.assets)
    .where(and(eq(schema.assets.id, assetId), eq(schema.assets.ownerId, ownerId)))
    .limit(1)
  return rows[0] ?? null
}

export const trashAsset = async (ownerId: string, assetId: string): Promise<boolean> => {
  const updated = await db
    .update(schema.assets)
    .set({ isTrashed: true, trashedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.assets.id, assetId), eq(schema.assets.ownerId, ownerId)))
    .returning({ id: schema.assets.id })
  if (updated.length > 0)
    await setNodesTrashedForAssets(ownerId, [assetId], true).catch(() => undefined)
  return updated.length > 0
}

const ownerScoped = (ownerId: string, assetIds: string[]) =>
  and(eq(schema.assets.ownerId, ownerId), inArray(schema.assets.id, assetIds))

export const setFavorite = async (ownerId: string, assetIds: string[], favorite: boolean) => {
  if (assetIds.length === 0) return
  await db
    .update(schema.assets)
    .set({ isFavorite: favorite, updatedAt: new Date() })
    .where(ownerScoped(ownerId, assetIds))
}

export const trashAssets = async (ownerId: string, assetIds: string[]) => {
  if (assetIds.length === 0) return
  await db
    .update(schema.assets)
    .set({ isTrashed: true, trashedAt: new Date(), updatedAt: new Date() })
    .where(ownerScoped(ownerId, assetIds))
  await setNodesTrashedForAssets(ownerId, assetIds, true).catch(() => undefined)
}

export const restoreAssets = async (ownerId: string, assetIds: string[]) => {
  if (assetIds.length === 0) return
  await db
    .update(schema.assets)
    .set({ isTrashed: false, trashedAt: null, updatedAt: new Date() })
    .where(ownerScoped(ownerId, assetIds))
  await setNodesTrashedForAssets(ownerId, assetIds, false).catch(() => undefined)
}

/** Permanently delete assets: remove derivatives + originals from storage, then rows. */
export const purgeAssets = async (ownerId: string, assetIds: string[]) => {
  if (assetIds.length === 0) return
  const rows = await db.select().from(schema.assets).where(ownerScoped(ownerId, assetIds))
  const driver = storage()
  for (const asset of rows) {
    await driver.delete(asset.storageKey).catch(() => undefined)
    if (asset.thumbnailKey) await driver.delete(asset.thumbnailKey).catch(() => undefined)
    if (asset.previewKey) await driver.delete(asset.previewKey).catch(() => undefined)
  }
  await db.delete(schema.assets).where(
    ownerScoped(
      ownerId,
      rows.map((row) => row.id),
    ),
  )
  await removeNodesForAssets(
    ownerId,
    rows.map((row) => row.id),
  ).catch(() => undefined)
}

/** Assets still being processed/transcoded — used to restore the upload panel after a reload. */
export const listProcessing = async (ownerId: string) =>
  db
    .select({ id: schema.assets.id, originalFilename: schema.assets.originalFilename })
    .from(schema.assets)
    .where(
      and(
        eq(schema.assets.ownerId, ownerId),
        eq(schema.assets.status, "processing"),
        eq(schema.assets.isTrashed, false),
      ),
    )
    .limit(200)

/** Permanently delete every trashed asset for an owner. */
export const emptyTrash = async (ownerId: string) => {
  const rows = await db
    .select({ id: schema.assets.id })
    .from(schema.assets)
    .where(and(eq(schema.assets.ownerId, ownerId), eq(schema.assets.isTrashed, true)))
  await purgeAssets(
    ownerId,
    rows.map((row) => row.id),
  )
}

export interface UsageDto {
  usedBytes: number
  quotaBytes: number | null
}

export const getUsage = async (ownerId: string): Promise<UsageDto> => {
  const rows = await db
    .select({ used: sql<string>`coalesce(sum(${schema.assets.sizeBytes}), 0)` })
    .from(schema.assets)
    .where(and(eq(schema.assets.ownerId, ownerId), eq(schema.assets.isTrashed, false)))
  const usedBytes = Number(rows[0]?.used ?? 0)
  const quota = await resolveLimit(ownerId, "storage.quota.bytes")
  return { usedBytes, quotaBytes: typeof quota === "number" ? quota : null }
}
