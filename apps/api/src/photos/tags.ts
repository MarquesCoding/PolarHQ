import { db, schema } from "@workspace/db"
import { and, asc, eq, inArray, sql } from "drizzle-orm"

export interface TagDto {
  id: string
  name: string
  count: number
}

export const listTags = async (ownerId: string): Promise<TagDto[]> => {
  const rows = await db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      count: sql<number>`count(${schema.assetTags.assetId})::int`,
    })
    .from(schema.tags)
    .leftJoin(schema.assetTags, eq(schema.assetTags.tagId, schema.tags.id))
    .where(eq(schema.tags.ownerId, ownerId))
    .groupBy(schema.tags.id, schema.tags.name)
    .orderBy(asc(schema.tags.name))
  return rows
}

export const createTag = async (ownerId: string, name: string) => {
  await db
    .insert(schema.tags)
    .values({ ownerId, name })
    .onConflictDoNothing({ target: [schema.tags.ownerId, schema.tags.name] })
  const rows = await db
    .select()
    .from(schema.tags)
    .where(and(eq(schema.tags.ownerId, ownerId), eq(schema.tags.name, name)))
    .limit(1)
  if (!rows[0]) throw new Error("Failed to create tag")
  return rows[0]
}

const ownsTag = async (ownerId: string, tagId: string): Promise<boolean> => {
  const rows = await db
    .select({ id: schema.tags.id })
    .from(schema.tags)
    .where(and(eq(schema.tags.id, tagId), eq(schema.tags.ownerId, ownerId)))
    .limit(1)
  return Boolean(rows[0])
}

const ownedAssetIds = async (ownerId: string, assetIds: string[]): Promise<string[]> => {
  if (assetIds.length === 0) return []
  const rows = await db
    .select({ id: schema.assets.id })
    .from(schema.assets)
    .where(and(eq(schema.assets.ownerId, ownerId), inArray(schema.assets.id, assetIds)))
  return rows.map((row) => row.id)
}

export const tagAssets = async (ownerId: string, tagId: string, assetIds: string[]) => {
  if (!(await ownsTag(ownerId, tagId))) throw new Error("Tag not found")
  const ids = await ownedAssetIds(ownerId, assetIds)
  if (ids.length === 0) return
  await db
    .insert(schema.assetTags)
    .values(ids.map((assetId) => ({ assetId, tagId })))
    .onConflictDoNothing()
}

export const untagAssets = async (ownerId: string, tagId: string, assetIds: string[]) => {
  if (!(await ownsTag(ownerId, tagId))) throw new Error("Tag not found")
  if (assetIds.length === 0) return
  await db
    .delete(schema.assetTags)
    .where(and(eq(schema.assetTags.tagId, tagId), inArray(schema.assetTags.assetId, assetIds)))
}

export const deleteTag = async (ownerId: string, tagId: string) => {
  await db.delete(schema.tags).where(and(eq(schema.tags.id, tagId), eq(schema.tags.ownerId, ownerId)))
}
