import { db, schema } from "@workspace/db"
import { storage } from "@workspace/storage"
import { and, desc, eq, isNull } from "drizzle-orm"
import { type DriveNode, ensureUserRoots, getNode, ingestDriveFile } from "../drive/service"

/** Mime that marks a Drive node as an Orbit document (a Yjs snapshot stored as the file body). */
export const DOC_MIME = "application/vnd.orbit.doc"

export const DEFAULT_DOC_TITLE = "Untitled document"

/**
 * Create a new document: a Drive file node (mime {@link DOC_MIME}) whose body is the
 * document's serialized content. New docs start empty — the client seeds the editor.
 */
export const createDoc = async (
  ownerId: string,
  parentId: string | null,
  title?: string,
): Promise<DriveNode> => {
  const { rootId } = await ensureUserRoots(ownerId)
  const resolvedParentId = parentId && parentId !== "root" ? parentId : rootId
  return ingestDriveFile({
    ownerId,
    parentId: resolvedParentId,
    filename: title?.trim() || DEFAULT_DOC_TITLE,
    mimeType: DOC_MIME,
    bytes: Buffer.alloc(0),
  })
}

/** Fetch a document's node + raw content bytes. Returns null if missing or not a doc. */
export const getDocContent = async (
  ownerId: string,
  nodeId: string,
): Promise<{ node: DriveNode; bytes: Buffer } | null> => {
  const node = await getNode(ownerId, nodeId)
  if (!node || node.kind !== "file" || node.mimeType !== DOC_MIME) return null
  const bytes = node.storageKey
    ? await storage().get(node.storageKey).catch(() => Buffer.alloc(0))
    : Buffer.alloc(0)
  return { node, bytes }
}

/**
 * Persist a document's content (a Yjs snapshot) by overwriting the Drive file body in
 * place. The editor autosaves frequently, so this intentionally does not version on every
 * write — Drive versions remain for explicit file operations.
 */
export const saveDocContent = async (
  ownerId: string,
  nodeId: string,
  bytes: Buffer,
): Promise<DriveNode | null> => {
  const node = await getNode(ownerId, nodeId)
  if (!node || node.kind !== "file" || node.mimeType !== DOC_MIME) return null
  const key = node.storageKey ?? `users/${ownerId}/drive/${node.id}`
  await storage().put({ key, body: bytes, contentType: DOC_MIME })
  const updated = await db
    .update(schema.nodes)
    .set({ storageKey: key, sizeBytes: bytes.length, updatedAt: new Date() })
    .where(and(eq(schema.nodes.ownerId, ownerId), eq(schema.nodes.id, node.id)))
    .returning()
  return updated[0]!
}

/** List every (non-trashed) document the owner has, newest first. */
export const listDocs = (ownerId: string): Promise<DriveNode[]> =>
  db
    .select()
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.ownerId, ownerId),
        eq(schema.nodes.mimeType, DOC_MIME),
        isNull(schema.nodes.trashedAt),
      ),
    )
    .orderBy(desc(schema.nodes.updatedAt))
