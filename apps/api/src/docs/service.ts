import { db, schema } from "@workspace/db"
import { storage } from "@workspace/storage"
import { and, desc, eq, isNull } from "drizzle-orm"
import { type DriveNode, ensureUserRoots, getNode, ingestDriveFile } from "../drive/service"

/**
 * Mimes that mark a Drive node as an Orbit collaborative document — a Yjs snapshot
 * stored as the file body. All three share the same storage, collaboration relay,
 * sharing, and E2E machinery; only the editor differs.
 */
export const DOC_MIME = "application/vnd.orbit.doc"
export const SHEET_MIME = "application/vnd.orbit.sheet"
export const SLIDES_MIME = "application/vnd.orbit.slides"
export const NOTE_MIME = "application/vnd.orbit.note"

export const ORBIT_DOC_MIMES = [DOC_MIME, SHEET_MIME, SLIDES_MIME, NOTE_MIME] as const
export type OrbitDocMime = (typeof ORBIT_DOC_MIMES)[number]

export const isOrbitDoc = (mime: string | null): mime is OrbitDocMime =>
  mime != null && (ORBIT_DOC_MIMES as readonly string[]).includes(mime)

const DEFAULT_TITLE: Record<OrbitDocMime, string> = {
  [DOC_MIME]: "Untitled document",
  [SHEET_MIME]: "Untitled spreadsheet",
  [SLIDES_MIME]: "Untitled presentation",
  [NOTE_MIME]: "Untitled note",
}

/**
 * Create a new collaborative document of the given type: a Drive file node whose body
 * is the serialized Yjs content. New docs start empty — the client seeds the editor.
 */
export const createDoc = async (
  ownerId: string,
  parentId: string | null,
  title?: string,
  mimeType: OrbitDocMime = DOC_MIME,
): Promise<DriveNode> => {
  const { rootId } = await ensureUserRoots(ownerId)
  const resolvedParentId = parentId && parentId !== "root" ? parentId : rootId
  return ingestDriveFile({
    ownerId,
    parentId: resolvedParentId,
    filename: title?.trim() || DEFAULT_TITLE[mimeType],
    mimeType,
    bytes: Buffer.alloc(0),
  })
}

export type DocRole = "editor" | "viewer"

const nodeById = async (nodeId: string): Promise<DriveNode | null> => {
  const rows = await db.select().from(schema.nodes).where(eq(schema.nodes.id, nodeId)).limit(1)
  return rows[0] ?? null
}

/** Whether a user may open a document (owner or any collaborator). */
export const canAccessDoc = async (userId: string, nodeId: string): Promise<boolean> => {
  const owned = await db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(and(eq(schema.nodes.id, nodeId), eq(schema.nodes.ownerId, userId)))
    .limit(1)
  if (owned[0]) return true
  if (await userOwnsAsset(userId, nodeId)) return true
  const collab = await db
    .select({ id: schema.collaborators.id })
    .from(schema.collaborators)
    .where(and(eq(schema.collaborators.nodeId, nodeId), eq(schema.collaborators.userId, userId)))
    .limit(1)
  return Boolean(collab[0])
}

/** Whether the user owns a Photos asset with this id (E2E content keys are keyed by asset id). */
export const userOwnsAsset = async (userId: string, id: string): Promise<boolean> => {
  const asset = await db
    .select({ id: schema.assets.id })
    .from(schema.assets)
    .where(and(eq(schema.assets.id, id), eq(schema.assets.ownerId, userId)))
    .limit(1)
  return Boolean(asset[0])
}

/** Fetch a doc node + content bytes for any viewer (owner or collaborator), else null. */
export const getDocForViewer = async (
  userId: string,
  nodeId: string,
): Promise<{ node: DriveNode; bytes: Buffer } | null> => {
  const node = await nodeById(nodeId)
  if (!node || node.kind !== "file" || !isOrbitDoc(node.mimeType) || node.trashedAt) return null
  if (node.ownerId !== userId && !(await canAccessDoc(userId, nodeId))) return null
  const bytes = node.storageKey
    ? await storage().get(node.storageKey).catch(() => Buffer.alloc(0))
    : Buffer.alloc(0)
  return { node, bytes }
}

/**
 * Persist a document's content (a Yjs snapshot) if the user is the owner or an editor
 * collaborator. Overwrites the file body in place — the editor autosaves frequently, so
 * this intentionally does not version on every write.
 */
export const saveDocForEditor = async (
  userId: string,
  nodeId: string,
  bytes: Buffer,
): Promise<DriveNode | null> => {
  const node = await nodeById(nodeId)
  if (!node || node.kind !== "file" || !isOrbitDoc(node.mimeType)) return null
  if (node.ownerId !== userId) {
    const collab = (
      await db
        .select()
        .from(schema.collaborators)
        .where(
          and(eq(schema.collaborators.nodeId, nodeId), eq(schema.collaborators.userId, userId)),
        )
        .limit(1)
    )[0]
    if (!collab || collab.role !== "editor") return null
  }
  const key = node.storageKey ?? `users/${node.ownerId}/drive/${node.id}`
  await storage().put({ key, body: bytes, contentType: DOC_MIME })
  const updated = await db
    .update(schema.nodes)
    .set({ storageKey: key, sizeBytes: bytes.length, updatedAt: new Date() })
    .where(eq(schema.nodes.id, node.id))
    .returning()
  return updated[0]!
}

/** List every (non-trashed) document of a type the owner has, newest first. */
export const listDocs = (ownerId: string, mime: OrbitDocMime = DOC_MIME): Promise<DriveNode[]> =>
  db
    .select()
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.ownerId, ownerId),
        eq(schema.nodes.mimeType, mime),
        isNull(schema.nodes.trashedAt),
      ),
    )
    .orderBy(desc(schema.nodes.updatedAt))

/** Documents of a type shared with the user by other people (newest first). */
export const listSharedDocs = async (
  userId: string,
  mime: OrbitDocMime = DOC_MIME,
): Promise<DriveNode[]> => {
  const rows = await db
    .select()
    .from(schema.collaborators)
    .innerJoin(schema.nodes, eq(schema.nodes.id, schema.collaborators.nodeId))
    .where(
      and(
        eq(schema.collaborators.userId, userId),
        eq(schema.nodes.mimeType, mime),
        isNull(schema.nodes.trashedAt),
      ),
    )
    .orderBy(desc(schema.nodes.updatedAt))
  return rows.map((row) => row.nodes)
}

export interface CollaboratorView {
  userId: string
  name: string
  email: string
  role: DocRole
}

/** List the collaborators the owner has granted access to (excludes the owner). */
export const listCollaborators = async (
  ownerId: string,
  nodeId: string,
): Promise<CollaboratorView[]> => {
  const node = await getNode(ownerId, nodeId)
  if (!node) return []
  const rows = await db
    .select({
      userId: schema.collaborators.userId,
      role: schema.collaborators.role,
      name: schema.user.name,
      email: schema.user.email,
    })
    .from(schema.collaborators)
    .innerJoin(schema.user, eq(schema.user.id, schema.collaborators.userId))
    .where(and(eq(schema.collaborators.nodeId, nodeId), eq(schema.collaborators.ownerId, ownerId)))
  return rows.map((row) => ({ ...row, role: row.role as DocRole }))
}

/** Grant a user (by email) access to a document. Owner-only. */
export const addCollaborator = async (
  ownerId: string,
  nodeId: string,
  email: string,
  role: DocRole,
): Promise<CollaboratorView> => {
  const node = await getNode(ownerId, nodeId)
  if (!node || !isOrbitDoc(node.mimeType)) throw new Error("not found")
  const target = (
    await db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, email.trim().toLowerCase()))
      .limit(1)
  )[0]
  if (!target) throw new Error("no such user")
  if (target.id === ownerId) throw new Error("already the owner")
  await db
    .insert(schema.collaborators)
    .values({ nodeId, ownerId, userId: target.id, role })
    .onConflictDoUpdate({
      target: [schema.collaborators.nodeId, schema.collaborators.userId],
      set: { role },
    })
  return { userId: target.id, name: target.name, email: target.email, role }
}

/** Revoke a user's access to a document. Owner-only. */
export const removeCollaborator = async (
  ownerId: string,
  nodeId: string,
  userId: string,
): Promise<void> => {
  await db
    .delete(schema.collaborators)
    .where(
      and(
        eq(schema.collaborators.ownerId, ownerId),
        eq(schema.collaborators.nodeId, nodeId),
        eq(schema.collaborators.userId, userId),
      ),
    )
}
