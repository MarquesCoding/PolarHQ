import { storage } from "@workspace/storage"
import { db, schema } from "@workspace/db"
import { and, desc, eq, inArray, sql } from "drizzle-orm"
import type { Asset } from "./service"

export interface AlbumDto {
  id: string
  name: string
  description: string | null
  assetCount: number
  coverThumbnailUrl: string | null
  coverAssetId: string | null
  coverEncrypted: boolean
  createdAt: Date
  updatedAt: Date
}

const presign = async (key: string | null): Promise<string | null> => {
  if (!key) return null
  const driver = storage()
  return driver.supportsPresign ? driver.presignGet(key, 3600) : null
}

interface CoverInfo {
  key: string
  assetId: string
  encrypted: boolean
}

const coverInfoFor = async (
  albumId: string,
  coverAssetId: string | null,
): Promise<CoverInfo | null> => {
  if (coverAssetId) {
    const rows = await db
      .select({ key: schema.assets.thumbnailKey, encrypted: schema.assets.encrypted })
      .from(schema.assets)
      .where(eq(schema.assets.id, coverAssetId))
      .limit(1)
    if (rows[0]?.key) return { key: rows[0].key, assetId: coverAssetId, encrypted: rows[0].encrypted }
  }
  const fallback = await db
    .select({
      id: schema.assets.id,
      key: schema.assets.thumbnailKey,
      encrypted: schema.assets.encrypted,
    })
    .from(schema.assets)
    .innerJoin(schema.albumAssets, eq(schema.albumAssets.assetId, schema.assets.id))
    .where(eq(schema.albumAssets.albumId, albumId))
    .orderBy(desc(schema.albumAssets.addedAt))
    .limit(1)
  const row = fallback[0]
  return row?.key ? { key: row.key, assetId: row.id, encrypted: row.encrypted } : null
}

export const listAlbums = async (ownerId: string): Promise<AlbumDto[]> => {
  const albums = await db
    .select()
    .from(schema.albums)
    .where(eq(schema.albums.ownerId, ownerId))
    .orderBy(desc(schema.albums.updatedAt))

  const result: AlbumDto[] = []
  for (const album of albums) {
    const countRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.albumAssets)
      .where(eq(schema.albumAssets.albumId, album.id))
    const cover = await coverInfoFor(album.id, album.coverAssetId)
    const coverThumbnailUrl = await presign(cover?.key ?? null)
    result.push({
      id: album.id,
      name: album.name,
      description: album.description,
      assetCount: countRows[0]?.count ?? 0,
      coverThumbnailUrl,
      coverAssetId: cover?.assetId ?? null,
      coverEncrypted: cover?.encrypted ?? false,
      createdAt: album.createdAt,
      updatedAt: album.updatedAt,
    })
  }
  return result
}

export const createAlbum = async (ownerId: string, name: string, description?: string) => {
  const inserted = await db
    .insert(schema.albums)
    .values({ ownerId, name, description })
    .returning()
  if (!inserted[0]) throw new Error("Failed to create album")
  return inserted[0]
}

export const getAlbumWithAssets = async (
  ownerId: string,
  albumId: string,
): Promise<{ album: typeof schema.albums.$inferSelect; assets: Asset[] } | null> => {
  const albumRows = await db
    .select()
    .from(schema.albums)
    .where(and(eq(schema.albums.id, albumId), eq(schema.albums.ownerId, ownerId)))
    .limit(1)
  const album = albumRows[0]
  if (!album) return null

  const joined = await db
    .select()
    .from(schema.assets)
    .innerJoin(schema.albumAssets, eq(schema.albumAssets.assetId, schema.assets.id))
    .where(and(eq(schema.albumAssets.albumId, albumId), eq(schema.assets.isTrashed, false)))
    .orderBy(desc(schema.assets.createdAt))
  return { album, assets: joined.map((row) => row.assets) }
}

const ownedAssetIds = async (ownerId: string, assetIds: string[]): Promise<string[]> => {
  if (assetIds.length === 0) return []
  const rows = await db
    .select({ id: schema.assets.id })
    .from(schema.assets)
    .where(and(eq(schema.assets.ownerId, ownerId), inArray(schema.assets.id, assetIds)))
  return rows.map((row) => row.id)
}

export const addAssetsToAlbum = async (ownerId: string, albumId: string, assetIds: string[]) => {
  const albumRows = await db
    .select()
    .from(schema.albums)
    .where(and(eq(schema.albums.id, albumId), eq(schema.albums.ownerId, ownerId)))
    .limit(1)
  const album = albumRows[0]
  if (!album) throw new Error("Album not found")

  const ids = await ownedAssetIds(ownerId, assetIds)
  if (ids.length === 0) return
  await db
    .insert(schema.albumAssets)
    .values(ids.map((assetId) => ({ albumId, assetId })))
    .onConflictDoNothing()
  await db
    .update(schema.albums)
    .set({ updatedAt: new Date(), coverAssetId: album.coverAssetId ?? ids[0] })
    .where(eq(schema.albums.id, albumId))
}

export const removeAssetsFromAlbum = async (
  ownerId: string,
  albumId: string,
  assetIds: string[],
) => {
  const albumRows = await db
    .select({ id: schema.albums.id })
    .from(schema.albums)
    .where(and(eq(schema.albums.id, albumId), eq(schema.albums.ownerId, ownerId)))
    .limit(1)
  if (!albumRows[0]) throw new Error("Album not found")
  if (assetIds.length === 0) return
  await db
    .delete(schema.albumAssets)
    .where(and(eq(schema.albumAssets.albumId, albumId), inArray(schema.albumAssets.assetId, assetIds)))
}

export const deleteAlbum = async (ownerId: string, albumId: string) => {
  await db
    .delete(schema.albums)
    .where(and(eq(schema.albums.id, albumId), eq(schema.albums.ownerId, ownerId)))
}
