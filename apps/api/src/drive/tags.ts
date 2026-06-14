import { db, schema } from "@polarhq/db"
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm"
import type { DriveNode } from "./service"

export interface DriveTag {
  id: string
  name: string
  count: number
}

/** All of the owner's tags with how many nodes carry each. */
export const listTags = async (ownerId: string): Promise<DriveTag[]> => {
  const rows = await db
    .select({
      id: schema.driveTags.id,
      name: schema.driveTags.name,
      count: sql<number>`count(${schema.nodeTags.nodeId})`,
    })
    .from(schema.driveTags)
    .leftJoin(schema.nodeTags, eq(schema.nodeTags.tagId, schema.driveTags.id))
    .where(eq(schema.driveTags.ownerId, ownerId))
    .groupBy(schema.driveTags.id, schema.driveTags.name)
    .orderBy(asc(schema.driveTags.name))
  return rows.map((row) => ({ id: row.id, name: row.name, count: Number(row.count) }))
}

/** Create a tag (or return the existing one with the same name). */
export const createTag = async (ownerId: string, name: string): Promise<DriveTag> => {
  const trimmed = name.trim()
  const existing = await db
    .select()
    .from(schema.driveTags)
    .where(and(eq(schema.driveTags.ownerId, ownerId), eq(schema.driveTags.name, trimmed)))
    .limit(1)
  if (existing[0]) return { id: existing[0].id, name: existing[0].name, count: 0 }
  const inserted = await db.insert(schema.driveTags).values({ ownerId, name: trimmed }).returning()
  return { id: inserted[0]!.id, name: inserted[0]!.name, count: 0 }
}

export const deleteTag = async (ownerId: string, id: string): Promise<void> => {
  await db
    .delete(schema.driveTags)
    .where(and(eq(schema.driveTags.ownerId, ownerId), eq(schema.driveTags.id, id)))
}

/** Tags attached to a single node. */
export const getNodeTags = async (ownerId: string, nodeId: string): Promise<DriveTag[]> => {
  const rows = await db
    .select({ id: schema.driveTags.id, name: schema.driveTags.name })
    .from(schema.nodeTags)
    .innerJoin(schema.driveTags, eq(schema.driveTags.id, schema.nodeTags.tagId))
    .where(and(eq(schema.nodeTags.nodeId, nodeId), eq(schema.driveTags.ownerId, ownerId)))
    .orderBy(asc(schema.driveTags.name))
  return rows.map((row) => ({ id: row.id, name: row.name, count: 0 }))
}

/** Replace a node's tags with the given set (only tags the owner owns are linked). */
export const setNodeTags = async (
  ownerId: string,
  nodeId: string,
  tagIds: string[],
): Promise<void> => {
  await db.delete(schema.nodeTags).where(eq(schema.nodeTags.nodeId, nodeId))
  if (tagIds.length === 0) return
  const owned = await db
    .select({ id: schema.driveTags.id })
    .from(schema.driveTags)
    .where(and(eq(schema.driveTags.ownerId, ownerId), inArray(schema.driveTags.id, tagIds)))
  if (owned.length === 0) return
  await db
    .insert(schema.nodeTags)
    .values(owned.map((tag) => ({ nodeId, tagId: tag.id })))
    .onConflictDoNothing()
}

/** All (untrashed) nodes carrying a given tag. */
export const listNodesByTag = async (ownerId: string, tagId: string): Promise<DriveNode[]> => {
  const rows = await db
    .select()
    .from(schema.nodes)
    .innerJoin(schema.nodeTags, eq(schema.nodeTags.nodeId, schema.nodes.id))
    .where(
      and(
        eq(schema.nodes.ownerId, ownerId),
        eq(schema.nodeTags.tagId, tagId),
        isNull(schema.nodes.trashedAt),
      ),
    )
    .orderBy(asc(schema.nodes.name))
  return rows.map((row) => row.nodes)
}
