import { createHash } from "node:crypto"
import { extname } from "node:path"
import { createId } from "@paralleldrive/cuid2"
import { resolveLimit } from "@workspace/auth"
import { db, schema } from "@workspace/db"
import { enqueueProcessAsset } from "@workspace/jobs"
import { assetObjectKeys, storage } from "@workspace/storage"
import { and, desc, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm"
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
  /** Ciphertext of the original media. */
  bytes: Buffer
  mimeType: string
  type?: "image" | "video" | "audio"
  width?: number
  height?: number
  durationMs?: number
  takenAt?: Date
  /** Filename encrypted with the account metadata key (the plaintext column gets a placeholder). */
  encryptedName?: string | null
  encryptedLocation?: string | null
  /** Camera/EXIF metadata JSON, encrypted with the account metadata key. */
  encryptedExif?: string | null
  placeholderName: string
}

/**
 * Ingest an end-to-end-encrypted image: the bytes are already ciphertext, so we store them
 * as-is and run NO media processing — the client owns the content key, thumbnail, and the
 * dimensions/takenAt the grid needs. The asset is `ready` immediately. We also create the
 * Drive "Photos" mirror node (carrying the encrypted name); the client wraps the content
 * key to that node id and uploads the encrypted thumbnail there too, so the mirror is a
 * self-contained encrypted Drive file that Drive's existing decrypt path can read.
 */
export const ingestEncryptedAsset = async (
  input: EncryptedIngestInput,
): Promise<{ asset: Asset; mirrorNodeId: string | null }> => {
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
      encryptedLocation: input.encryptedLocation ?? null,
      encryptedExif: input.encryptedExif ?? null,
      encrypted: true,
      mimeType: input.mimeType,
      type: input.type ?? "image",
      sizeBytes: input.bytes.length,
      width: input.width ?? null,
      height: input.height ?? null,
      durationMs: input.durationMs ?? null,
      storageKey: keys.original,
      status: "ready",
      takenAt: input.takenAt ?? null,
    })
    .returning()

  const asset = inserted[0]
  if (!asset) throw new Error("Failed to insert asset")

  const mirror = await ensurePhotosDriveNode(input.ownerId, asset).catch(() => null)
  return { asset, mirrorNodeId: mirror?.id ?? null }
}

/** Store an encrypted ML embedding for an owned asset (upsert by asset+kind). */
export const setEmbedding = async (
  ownerId: string,
  assetId: string,
  input: { kind: string; modelVersion: string; vector: string },
): Promise<boolean> => {
  const asset = await getAsset(ownerId, assetId)
  if (!asset) return false
  await db
    .insert(schema.embeddings)
    .values({ assetId, kind: input.kind, modelVersion: input.modelVersion, vector: input.vector })
    .onConflictDoUpdate({
      target: [schema.embeddings.assetId, schema.embeddings.kind],
      set: { modelVersion: input.modelVersion, vector: input.vector },
    })
  return true
}

export interface EmbeddingRow {
  assetId: string
  modelVersion: string
  vector: string
}

/** All of a user's encrypted embeddings of a kind — the client decrypts + searches them. */
export const listEmbeddings = async (
  ownerId: string,
  kind: string,
): Promise<EmbeddingRow[]> =>
  db
    .select({
      assetId: schema.embeddings.assetId,
      modelVersion: schema.embeddings.modelVersion,
      vector: schema.embeddings.vector,
    })
    .from(schema.embeddings)
    .innerJoin(schema.assets, eq(schema.assets.id, schema.embeddings.assetId))
    .where(and(eq(schema.assets.ownerId, ownerId), eq(schema.embeddings.kind, kind)))

/**
 * Asset ids (this owner) that still need an embedding — the backfill worklist. When a
 * modelVersion is given, assets whose only embedding is a *different* version are included
 * too, so upgrading the model re-indexes the library instead of leaving stale vectors.
 */
export const assetsMissingEmbedding = async (
  ownerId: string,
  kind: string,
  modelVersion?: string,
): Promise<string[]> => {
  const joinOn = and(
    eq(schema.embeddings.assetId, schema.assets.id),
    eq(schema.embeddings.kind, kind),
    modelVersion ? eq(schema.embeddings.modelVersion, modelVersion) : undefined,
  )
  const rows = await db
    .select({ id: schema.assets.id })
    .from(schema.assets)
    .leftJoin(schema.embeddings, joinOn)
    .where(
      and(
        eq(schema.assets.ownerId, ownerId),
        eq(schema.assets.type, "image"),
        eq(schema.assets.isTrashed, false),
        isNull(schema.embeddings.assetId),
      ),
    )
  return rows.map((r) => r.id)
}

/** Store the encrypted GPS location for an owned asset (client-extracted at upload/backfill). */
export const setEncryptedLocation = async (
  ownerId: string,
  assetId: string,
  encryptedLocation: string,
): Promise<boolean> => {
  const asset = await getAsset(ownerId, assetId)
  if (!asset) return false
  await db
    .update(schema.assets)
    .set({ encryptedLocation, updatedAt: new Date() })
    .where(eq(schema.assets.id, assetId))
  return true
}

export interface LocationRow {
  assetId: string
  encryptedLocation: string
  takenAt: Date | null
}

/** Encrypted locations for the owner's non-trashed photos (the map decrypts them client-side). */
export const listLocations = async (ownerId: string): Promise<LocationRow[]> =>
  db
    .select({
      assetId: schema.assets.id,
      encryptedLocation: schema.assets.encryptedLocation,
      takenAt: schema.assets.takenAt,
    })
    .from(schema.assets)
    .where(
      and(
        eq(schema.assets.ownerId, ownerId),
        eq(schema.assets.isTrashed, false),
        isNotNull(schema.assets.encryptedLocation),
      ),
    )
    .then((rows) =>
      rows.map((r) => ({
        assetId: r.assetId,
        encryptedLocation: r.encryptedLocation!,
        takenAt: r.takenAt,
      })),
    )

/** Owned image ids that have no encrypted location yet — the GPS backfill worklist. */
export const assetsMissingLocation = async (ownerId: string): Promise<string[]> => {
  const rows = await db
    .select({ id: schema.assets.id })
    .from(schema.assets)
    .where(
      and(
        eq(schema.assets.ownerId, ownerId),
        eq(schema.assets.type, "image"),
        eq(schema.assets.encrypted, true),
        eq(schema.assets.isTrashed, false),
        isNull(schema.assets.encryptedLocation),
      ),
    )
  return rows.map((r) => r.id)
}

/**
 * Store a client-encrypted motion-photo video for an asset (the short clip paired with a
 * still, à la Google/Apple Live Photos). The bytes are already ciphertext under the asset's
 * content key — the server stores them opaquely and only flags that a motion clip exists.
 */
export const setMotionVideo = async (
  ownerId: string,
  assetId: string,
  bytes: Buffer,
): Promise<boolean> => {
  const asset = await getAsset(ownerId, assetId)
  if (!asset) return false
  const key = assetObjectKeys(ownerId, assetId, ".bin").motion
  await storage().put({ key, body: bytes, contentType: "application/octet-stream" })
  await db
    .update(schema.assets)
    .set({ motionKey: key, updatedAt: new Date() })
    .where(eq(schema.assets.id, assetId))
  return true
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
  if (options.cursor) {
    const [createdAtPart, idPart] = options.cursor.split("|")
    const cursorDate = new Date(createdAtPart ?? options.cursor)
    conditions.push(
      idPart
        ? (or(
            lt(schema.assets.createdAt, cursorDate),
            and(eq(schema.assets.createdAt, cursorDate), lt(schema.assets.id, idPart)),
          ) ?? lt(schema.assets.createdAt, cursorDate))
        : lt(schema.assets.createdAt, cursorDate),
    )
  }

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
    .orderBy(desc(schema.assets.createdAt), desc(schema.assets.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page[page.length - 1]
  const nextCursor = hasMore && last ? `${last.createdAt.toISOString()}|${last.id}` : null
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
