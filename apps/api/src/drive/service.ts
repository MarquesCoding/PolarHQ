import { Readable } from "node:stream"
import { extname } from "node:path"
import { createGunzip } from "node:zlib"
import { resolveLimit } from "@workspace/auth"
import { createId } from "@paralleldrive/cuid2"
import { db, schema } from "@workspace/db"
import { storage } from "@workspace/storage"
import AdmZip from "adm-zip"
import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm"
import { extract as tarExtract } from "tar-stream"

export type DriveNode = typeof schema.nodes.$inferSelect

const driveObjectKey = (ownerId: string, nodeId: string, filename: string): string =>
  `users/${ownerId}/drive/${nodeId}${extname(filename)}`

/** Ensure the owner's root folder + special "Photos" folder exist; return their ids. */
export const ensureUserRoots = async (
  ownerId: string,
): Promise<{ rootId: string; photosId: string }> => {
  const specials = await db
    .select()
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.ownerId, ownerId),
        inArray(schema.nodes.special, ["root", "photos"]),
      ),
    )

  let root = specials.find((node) => node.special === "root")
  if (!root) {
    root = (
      await db
        .insert(schema.nodes)
        .values({ ownerId, parentId: null, kind: "folder", name: "My Drive", special: "root" })
        .returning()
    )[0]!
  }

  let photos = specials.find((node) => node.special === "photos")
  if (!photos) {
    photos = (
      await db
        .insert(schema.nodes)
        .values({
          ownerId,
          parentId: root.id,
          kind: "folder",
          name: "Photos",
          special: "photos",
        })
        .returning()
    )[0]!
  }

  return { rootId: root.id, photosId: photos.id }
}

export const getNode = async (ownerId: string, id: string): Promise<DriveNode | null> => {
  const rows = await db
    .select()
    .from(schema.nodes)
    .where(and(eq(schema.nodes.ownerId, ownerId), eq(schema.nodes.id, id)))
    .limit(1)
  return rows[0] ?? null
}

/** List a folder's children. A null/"root" parent resolves to the owner's root folder. */
export const listChildren = async (
  ownerId: string,
  parentId: string | null,
): Promise<{ parent: DriveNode; children: DriveNode[] }> => {
  const { rootId } = await ensureUserRoots(ownerId)
  const resolvedParentId = parentId && parentId !== "root" ? parentId : rootId
  const parent = await getNode(ownerId, resolvedParentId)
  if (!parent) throw new Error("folder not found")

  const children = await db
    .select()
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.ownerId, ownerId),
        eq(schema.nodes.parentId, resolvedParentId),
        isNull(schema.nodes.trashedAt),
      ),
    )
    .orderBy(asc(schema.nodes.kind), asc(schema.nodes.name))

  return { parent, children }
}

/** Build the ancestor chain (root → … → node) for breadcrumbs. */
export const breadcrumb = async (ownerId: string, nodeId: string): Promise<DriveNode[]> => {
  const chain: DriveNode[] = []
  let current = await getNode(ownerId, nodeId)
  while (current) {
    chain.unshift(current)
    current = current.parentId ? await getNode(ownerId, current.parentId) : null
  }
  return chain
}

export const createFolder = async (
  ownerId: string,
  parentId: string | null,
  name: string,
  encryptedName?: string | null,
): Promise<DriveNode> => {
  const { rootId } = await ensureUserRoots(ownerId)
  const resolvedParentId = parentId && parentId !== "root" ? parentId : rootId
  const inserted = await db
    .insert(schema.nodes)
    .values({ ownerId, parentId: resolvedParentId, kind: "folder", name, encryptedName })
    .returning()
  return inserted[0]!
}

/** Store a plain (non-Photos) file's bytes and create its node. */
export const ingestDriveFile = async (input: {
  ownerId: string
  parentId: string
  filename: string
  mimeType: string
  bytes: Buffer
  encryptedName?: string | null
}): Promise<DriveNode> => {
  const nodeId = createId()
  const key = driveObjectKey(input.ownerId, nodeId, input.filename)
  await storage().put({ key, body: input.bytes, contentType: input.mimeType })
  const inserted = await db
    .insert(schema.nodes)
    .values({
      id: nodeId,
      ownerId: input.ownerId,
      parentId: input.parentId,
      kind: "file",
      name: input.filename,
      encryptedName: input.encryptedName,
      mimeType: input.mimeType,
      sizeBytes: input.bytes.length,
      storageKey: key,
    })
    .returning()
  return inserted[0]!
}

/**
 * Mirror a Photos asset into the Drive "Photos" folder (idempotent). Called
 * whenever a photo is ingested, so the same object shows in both apps.
 */
export const ensurePhotosDriveNode = async (
  ownerId: string,
  asset: {
    id: string
    originalFilename: string
    mimeType: string
    sizeBytes: number
    storageKey: string
    encryptedName?: string | null
  },
): Promise<DriveNode> => {
  const existing = await db
    .select()
    .from(schema.nodes)
    .where(and(eq(schema.nodes.ownerId, ownerId), eq(schema.nodes.photoAssetId, asset.id)))
    .limit(1)
  if (existing[0]) return existing[0]

  const { photosId } = await ensureUserRoots(ownerId)
  const inserted = await db
    .insert(schema.nodes)
    .values({
      ownerId,
      parentId: photosId,
      kind: "file",
      name: asset.originalFilename,
      encryptedName: asset.encryptedName ?? null,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      storageKey: asset.storageKey,
      photoAssetId: asset.id,
    })
    .returning()
  return inserted[0]!
}

/** Create a Drive node in `parentId` linked to a Photos asset, so it shows the asset's thumbnail. */
export const linkAssetNode = async (
  ownerId: string,
  parentId: string,
  asset: {
    id: string
    originalFilename: string
    mimeType: string
    sizeBytes: number
    storageKey: string
  },
): Promise<DriveNode> => {
  const inserted = await db
    .insert(schema.nodes)
    .values({
      ownerId,
      parentId,
      kind: "file",
      name: asset.originalFilename,
      mimeType: asset.mimeType,
      sizeBytes: asset.sizeBytes,
      storageKey: asset.storageKey,
      photoAssetId: asset.id,
    })
    .returning()
  return inserted[0]!
}

export const renameNode = async (
  ownerId: string,
  id: string,
  name: string,
  encryptedName?: string | null,
  sharedName?: string | null,
): Promise<void> => {
  const set: Partial<typeof schema.nodes.$inferInsert> = { name, updatedAt: new Date() }
  if (encryptedName !== undefined) set.encryptedName = encryptedName
  if (sharedName !== undefined) set.sharedName = sharedName
  await db
    .update(schema.nodes)
    .set(set)
    .where(and(eq(schema.nodes.ownerId, ownerId), eq(schema.nodes.id, id)))
}

export const moveNode = async (
  ownerId: string,
  id: string,
  parentId: string,
): Promise<void> => {
  await db
    .update(schema.nodes)
    .set({ parentId, updatedAt: new Date() })
    .where(and(eq(schema.nodes.ownerId, ownerId), eq(schema.nodes.id, id)))
}

export const setNodeLock = async (
  ownerId: string,
  id: string,
  salt: string,
  verifier: string,
): Promise<boolean> => {
  const node = await getNode(ownerId, id)
  if (!node || node.kind !== "folder" || node.special) return false
  await db
    .update(schema.nodes)
    .set({ lockSalt: salt, lockVerifier: verifier, updatedAt: new Date() })
    .where(and(eq(schema.nodes.ownerId, ownerId), eq(schema.nodes.id, id)))
  return true
}

export const clearNodeLock = async (ownerId: string, id: string): Promise<void> => {
  await db
    .update(schema.nodes)
    .set({ lockSalt: null, lockVerifier: null, updatedAt: new Date() })
    .where(and(eq(schema.nodes.ownerId, ownerId), eq(schema.nodes.id, id)))
}

export const getNodeLock = async (
  ownerId: string,
  id: string,
): Promise<{ salt: string; verifier: string } | null> => {
  const node = await getNode(ownerId, id)
  if (!node?.lockSalt || !node.lockVerifier) return null
  return { salt: node.lockSalt, verifier: node.lockVerifier }
}

const linkedAssetIds = (nodes: DriveNode[]): string[] =>
  nodes.map((node) => node.photoAssetId).filter((value): value is string => Boolean(value))

/** Collect a node and every descendant (the whole subtree), via a parent→children map. */
const collectSubtree = async (ownerId: string, id: string): Promise<DriveNode[]> => {
  const all = await db.select().from(schema.nodes).where(eq(schema.nodes.ownerId, ownerId))
  const byParent = new Map<string | null, DriveNode[]>()
  for (const node of all) {
    const list = byParent.get(node.parentId) ?? []
    list.push(node)
    byParent.set(node.parentId, list)
  }
  const subtree: DriveNode[] = []
  const stack = all.filter((node) => node.id === id)
  while (stack.length > 0) {
    const node = stack.pop()!
    subtree.push(node)
    stack.push(...(byParent.get(node.id) ?? []))
  }
  return subtree
}

/** Delete version storage objects + version/share rows for the given node ids. */
const purgeNodeArtifacts = async (ownerId: string, nodeIds: string[]): Promise<void> => {
  if (nodeIds.length === 0) return
  const vers = await db
    .select()
    .from(schema.versions)
    .where(and(eq(schema.versions.ownerId, ownerId), inArray(schema.versions.nodeId, nodeIds)))
  const driver = storage()
  for (const version of vers) await driver.delete(version.storageKey).catch(() => undefined)
  await db
    .delete(schema.versions)
    .where(and(eq(schema.versions.ownerId, ownerId), inArray(schema.versions.nodeId, nodeIds)))
  await db
    .delete(schema.shares)
    .where(and(eq(schema.shares.ownerId, ownerId), inArray(schema.shares.nodeId, nodeIds)))
}

/**
 * Soft-delete a node and its descendants (set `trashedAt`). Returns the linked
 * photo asset ids so the caller can trash them in Photos too (keeping in sync).
 */
export const trashNodeTree = async (
  ownerId: string,
  id: string,
): Promise<{ trashedAssetIds: string[] }> => {
  const subtree = (await collectSubtree(ownerId, id)).filter((node) => !node.trashedAt)
  if (subtree.length === 0) return { trashedAssetIds: [] }
  const now = new Date()
  await db
    .update(schema.nodes)
    .set({ trashedAt: now, updatedAt: now })
    .where(inArray(schema.nodes.id, subtree.map((node) => node.id)))
  return { trashedAssetIds: linkedAssetIds(subtree) }
}

/** Restore a trashed node and its descendants. Returns the linked photo asset ids. */
export const restoreNodeTree = async (
  ownerId: string,
  id: string,
): Promise<{ restoredAssetIds: string[] }> => {
  const subtree = (await collectSubtree(ownerId, id)).filter((node) => node.trashedAt)
  if (subtree.length === 0) return { restoredAssetIds: [] }
  const now = new Date()
  await db
    .update(schema.nodes)
    .set({ trashedAt: null, updatedAt: now })
    .where(inArray(schema.nodes.id, subtree.map((node) => node.id)))
  return { restoredAssetIds: linkedAssetIds(subtree) }
}

/** List trashed nodes, collapsed to the root of each trashed subtree (newest first). */
export const TRASH_RETENTION_DAYS = 30

/** Permanently delete trashed nodes older than the retention window. Returns linked asset ids. */
export const purgeExpiredTrash = async (
  ownerId: string,
): Promise<{ removedAssetIds: string[] }> => {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 86_400_000)
  const expired = await db
    .select()
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.ownerId, ownerId),
        isNotNull(schema.nodes.trashedAt),
        lt(schema.nodes.trashedAt, cutoff),
      ),
    )
  if (expired.length === 0) return { removedAssetIds: [] }
  const driver = storage()
  for (const node of expired) {
    if (node.kind === "file" && node.storageKey && !node.photoAssetId) {
      await driver.delete(node.storageKey).catch(() => undefined)
    }
  }
  const ids = expired.map((node) => node.id)
  await purgeNodeArtifacts(ownerId, ids)
  await db.delete(schema.nodes).where(inArray(schema.nodes.id, ids))
  return { removedAssetIds: linkedAssetIds(expired) }
}

export const listTrash = async (ownerId: string): Promise<DriveNode[]> => {
  const trashed = await db
    .select()
    .from(schema.nodes)
    .where(and(eq(schema.nodes.ownerId, ownerId), isNotNull(schema.nodes.trashedAt)))
    .orderBy(desc(schema.nodes.trashedAt))
  const trashedIds = new Set(trashed.map((node) => node.id))
  return trashed.filter((node) => !node.parentId || !trashedIds.has(node.parentId))
}

/** Set/clear `trashedAt` on the mirror nodes of the given Photos assets (called on photo trash/restore). */
export const setNodesTrashedForAssets = async (
  ownerId: string,
  assetIds: string[],
  trashed: boolean,
): Promise<void> => {
  if (assetIds.length === 0) return
  const now = new Date()
  await db
    .update(schema.nodes)
    .set({ trashedAt: trashed ? now : null, updatedAt: now })
    .where(and(eq(schema.nodes.ownerId, ownerId), inArray(schema.nodes.photoAssetId, assetIds)))
}

/**
 * Permanently delete a node and its descendants: removes plain-file objects from
 * storage and the node rows. Returns the linked photo asset ids so the caller can
 * purge them from Photos (keeping the two apps in sync).
 */
export const deleteNode = async (
  ownerId: string,
  id: string,
): Promise<{ removedAssetIds: string[] }> => {
  const subtree = await collectSubtree(ownerId, id)
  const driver = storage()
  for (const node of subtree) {
    if (node.kind === "file" && node.storageKey && !node.photoAssetId) {
      await driver.delete(node.storageKey).catch(() => undefined)
    }
  }
  await purgeNodeArtifacts(ownerId, subtree.map((node) => node.id))
  await db.delete(schema.nodes).where(inArray(schema.nodes.id, subtree.map((node) => node.id)))
  return { removedAssetIds: linkedAssetIds(subtree) }
}

/** Permanently delete every trashed node for an owner. Returns the linked photo asset ids. */
export const purgeTrash = async (ownerId: string): Promise<{ removedAssetIds: string[] }> => {
  const trashed = await db
    .select()
    .from(schema.nodes)
    .where(and(eq(schema.nodes.ownerId, ownerId), isNotNull(schema.nodes.trashedAt)))
  const driver = storage()
  for (const node of trashed) {
    if (node.kind === "file" && node.storageKey && !node.photoAssetId) {
      await driver.delete(node.storageKey).catch(() => undefined)
    }
  }
  await purgeNodeArtifacts(ownerId, trashed.map((node) => node.id))
  await db.delete(schema.nodes).where(inArray(schema.nodes.id, trashed.map((node) => node.id)))
  return { removedAssetIds: linkedAssetIds(trashed) }
}

/** Remove the Drive nodes that mirror the given Photos assets (called on photo purge). */
export const removeNodesForAssets = async (
  ownerId: string,
  assetIds: string[],
): Promise<void> => {
  if (assetIds.length === 0) return
  await db
    .delete(schema.nodes)
    .where(and(eq(schema.nodes.ownerId, ownerId), inArray(schema.nodes.photoAssetId, assetIds)))
}

export const isMediaMime = (mimeType: string): boolean =>
  mimeType.startsWith("image/") ||
  mimeType.startsWith("video/") ||
  mimeType.startsWith("audio/")

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".json": "application/json",
  ".zip": "application/zip",
}

const mimeFromName = (name: string): string =>
  MIME_BY_EXT[extname(name).toLowerCase()] ?? "application/octet-stream"

const ARCHIVE_EXTENSIONS = [".zip", ".tar", ".tar.gz", ".tgz", ".rar"]

/** Whether a filename looks like a supported archive (zip / tar / tar.gz / tgz / rar). */
export const isArchiveName = (name: string): boolean => {
  const lower = name.toLowerCase()
  return ARCHIVE_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

const childrenOf = (ownerId: string, parentId: string): Promise<DriveNode[]> =>
  db
    .select()
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.ownerId, ownerId),
        eq(schema.nodes.parentId, parentId),
        isNull(schema.nodes.trashedAt),
      ),
    )

const uniqueEntry = (name: string, used: Set<string>): string => {
  let candidate = name
  let counter = 1
  while (used.has(candidate)) {
    const ext = extname(name)
    candidate = `${name.slice(0, name.length - ext.length)} (${counter})${ext}`
    counter += 1
  }
  used.add(candidate)
  return candidate
}

interface ZipEntry {
  path: string
  storageKey: string | null
}

const collectZipEntries = async (
  ownerId: string,
  node: DriveNode,
  prefix: string,
  out: ZipEntry[],
): Promise<void> => {
  if (node.kind === "file") {
    if (node.storageKey) out.push({ path: `${prefix}${node.name}`, storageKey: node.storageKey })
    return
  }
  const folderPath = `${prefix}${node.name}/`
  const children = await childrenOf(ownerId, node.id)
  if (children.length === 0) {
    out.push({ path: folderPath, storageKey: null })
    return
  }
  for (const child of children) await collectZipEntries(ownerId, child, folderPath, out)
}

/**
 * Zip the selected nodes (files + folder subtrees) into a new archive in `parentId`.
 * `onProgress(done, total)` fires per file so callers can report progress.
 */
export const archiveNodes = async (
  ownerId: string,
  nodeIds: string[],
  parentId: string,
  onProgress?: (done: number, total: number) => void,
): Promise<DriveNode> => {
  const entries: ZipEntry[] = []
  const usedTop = new Set<string>()
  for (const nodeId of nodeIds) {
    const node = await getNode(ownerId, nodeId)
    if (!node || node.trashedAt) continue
    const safeName = uniqueEntry(node.name, usedTop)
    await collectZipEntries(ownerId, { ...node, name: safeName }, "", entries)
  }

  const total = entries.filter((entry) => entry.storageKey).length
  onProgress?.(0, total)

  const zip = new AdmZip()
  let done = 0
  for (const entry of entries) {
    if (!entry.storageKey) {
      zip.addFile(entry.path, Buffer.alloc(0))
      continue
    }
    zip.addFile(entry.path, await storage().get(entry.storageKey))
    done += 1
    onProgress?.(done, total)
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")
  const buffer = zip.toBuffer()
  return ingestDriveFile({
    ownerId,
    parentId,
    filename: `archive-${stamp}.zip`,
    mimeType: "application/zip",
    bytes: buffer,
  })
}

interface ArchiveEntry {
  path: string
  isDir: boolean
  data: Buffer
}

const readZipEntries = (data: Buffer): ArchiveEntry[] =>
  new AdmZip(data).getEntries().map((entry) => ({
    path: entry.entryName,
    isDir: entry.isDirectory,
    data: entry.isDirectory ? Buffer.alloc(0) : entry.getData(),
  }))

const readTarEntries = (data: Buffer, gzip: boolean): Promise<ArchiveEntry[]> =>
  new Promise((resolve, reject) => {
    const entries: ArchiveEntry[] = []
    const extractor = tarExtract()
    extractor.on("entry", (header, stream, next) => {
      const chunks: Buffer[] = []
      stream.on("data", (chunk: Buffer) => chunks.push(chunk))
      stream.on("end", () => {
        entries.push({
          path: header.name,
          isDir: header.type === "directory",
          data: Buffer.concat(chunks),
        })
        next()
      })
      stream.on("error", reject)
      stream.resume()
    })
    extractor.on("finish", () => resolve(entries))
    extractor.on("error", reject)
    const source = Readable.from(data)
    if (gzip) source.pipe(createGunzip()).pipe(extractor)
    else source.pipe(extractor)
  })

const readRarEntries = async (data: Buffer): Promise<ArchiveEntry[]> => {
  const { createExtractorFromData } = await import("node-unrar-js")
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
  const extractor = await createExtractorFromData({ data: buffer })
  const extracted = extractor.extract()
  const entries: ArchiveEntry[] = []
  for (const file of extracted.files) {
    entries.push({
      path: file.fileHeader.name,
      isDir: file.fileHeader.flags.directory,
      data: file.extraction ? Buffer.from(file.extraction) : Buffer.alloc(0),
    })
  }
  return entries
}

const readArchive = (name: string, data: Buffer): ArchiveEntry[] | Promise<ArchiveEntry[]> => {
  const lower = name.toLowerCase()
  if (lower.endsWith(".zip")) return readZipEntries(data)
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) return readTarEntries(data, true)
  if (lower.endsWith(".tar")) return readTarEntries(data, false)
  if (lower.endsWith(".rar")) return readRarEntries(data)
  throw new Error("unsupported archive format")
}

/** Strip a single trailing archive extension to name the extraction folder. */
const archiveBaseName = (name: string): string => {
  const lower = name.toLowerCase()
  for (const ext of [".tar.gz", ".tgz", ".tar", ".zip", ".rar"]) {
    if (lower.endsWith(ext)) return name.slice(0, name.length - ext.length) || name
  }
  return name
}

const safeParts = (path: string): string[] =>
  path
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")

/** Extract an archive node into a new folder beside it. Returns the new folder node. */
export const extractArchive = async (ownerId: string, nodeId: string): Promise<DriveNode> => {
  const node = await getNode(ownerId, nodeId)
  if (!node || node.kind !== "file" || !node.storageKey) throw new Error("not an archive")
  if (!isArchiveName(node.name)) throw new Error("unsupported archive format")

  const data = await storage().get(node.storageKey)
  const entries = await readArchive(node.name, data)

  const parentId = node.parentId ?? (await ensureUserRoots(ownerId)).rootId
  const dest = await createFolder(ownerId, parentId, archiveBaseName(node.name))

  const folderByPath = new Map<string, string>([["", dest.id]])
  const ensureFolder = async (parts: string[]): Promise<string> => {
    const key = parts.join("/")
    const cached = folderByPath.get(key)
    if (cached) return cached
    const parentFolder = await ensureFolder(parts.slice(0, -1))
    const folder = await createFolder(ownerId, parentFolder, parts[parts.length - 1]!)
    folderByPath.set(key, folder.id)
    return folder.id
  }

  for (const entry of entries) {
    const parts = safeParts(entry.path)
    if (parts.length === 0) continue
    if (entry.isDir) {
      await ensureFolder(parts)
      continue
    }
    const filename = parts[parts.length - 1]!
    const folderId = await ensureFolder(parts.slice(0, -1))
    await ingestDriveFile({
      ownerId,
      parentId: folderId,
      filename,
      mimeType: mimeFromName(filename),
      bytes: entry.data,
    })
  }

  return dest
}

export type DriveVersion = typeof schema.versions.$inferSelect

const uniqueCopyName = (name: string, used: Set<string>): string => {
  const ext = extname(name)
  const base = name.slice(0, name.length - ext.length)
  let candidate = `${base} (copy)${ext}`
  let counter = 2
  while (used.has(candidate)) {
    candidate = `${base} (copy ${counter})${ext}`
    counter += 1
  }
  used.add(candidate)
  return candidate
}

const copySubtree = async (
  ownerId: string,
  node: DriveNode,
  newParentId: string,
  newName: string,
): Promise<DriveNode> => {
  if (node.kind === "file") {
    const data = node.storageKey ? await storage().get(node.storageKey) : Buffer.alloc(0)
    return ingestDriveFile({
      ownerId,
      parentId: newParentId,
      filename: newName,
      mimeType: node.mimeType ?? mimeFromName(newName),
      bytes: data,
    })
  }
  const folder = await createFolder(ownerId, newParentId, newName)
  for (const child of await childrenOf(ownerId, node.id)) {
    await copySubtree(ownerId, child, folder.id, child.name)
  }
  return folder
}

/** Duplicate a node (file, or a whole folder subtree) beside itself. */
export const copyNode = async (ownerId: string, id: string): Promise<DriveNode> => {
  const node = await getNode(ownerId, id)
  if (!node || node.trashedAt) throw new Error("not found")
  const parentId = node.parentId ?? (await ensureUserRoots(ownerId)).rootId
  const used = new Set((await childrenOf(ownerId, parentId)).map((sibling) => sibling.name))
  return copySubtree(ownerId, node, parentId, uniqueCopyName(node.name, used))
}

/** All non-trashed folders for an owner (for the move-to-folder picker). */
export const listFolders = (ownerId: string): Promise<DriveNode[]> =>
  db
    .select()
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.ownerId, ownerId),
        eq(schema.nodes.kind, "folder"),
        isNull(schema.nodes.trashedAt),
      ),
    )
    .orderBy(asc(schema.nodes.name))

export type DriveShare = typeof schema.shares.$inferSelect

export interface ShareOptions {
  expiresAt?: Date | null
  maxDownloads?: number | null
}

/** Create or update the public share for a node (one share per node, stable token). */
export const createShare = async (
  ownerId: string,
  nodeId: string,
  options: ShareOptions = {},
): Promise<DriveShare> => {
  const node = await getNode(ownerId, nodeId)
  if (!node) throw new Error("not found")
  const values = {
    expiresAt: options.expiresAt ?? null,
    maxDownloads: options.maxDownloads ?? null,
  }
  const existing = (
    await db
      .select()
      .from(schema.shares)
      .where(and(eq(schema.shares.ownerId, ownerId), eq(schema.shares.nodeId, nodeId)))
      .limit(1)
  )[0]
  if (existing) {
    const updated = await db
      .update(schema.shares)
      .set(values)
      .where(eq(schema.shares.id, existing.id))
      .returning()
    return updated[0]!
  }
  const inserted = await db
    .insert(schema.shares)
    .values({ ownerId, nodeId, ...values })
    .returning()
  return inserted[0]!
}

/** Create/update a public share for the Drive node mirroring a Photos asset. */
export const createShareForAsset = async (
  ownerId: string,
  assetId: string,
  options: ShareOptions = {},
): Promise<DriveShare | null> => {
  const node = (
    await db
      .select()
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.ownerId, ownerId),
          eq(schema.nodes.photoAssetId, assetId),
          isNull(schema.nodes.trashedAt),
        ),
      )
      .limit(1)
  )[0]
  if (!node) return null
  return createShare(ownerId, node.id, options)
}

export interface ShareView {
  share: DriveShare
  node: DriveNode
  ownerName: string
}

/** Resolve a public share token to its share + file node + sharer name. */
export const getShareView = async (token: string): Promise<ShareView | null> => {
  const share = (
    await db.select().from(schema.shares).where(eq(schema.shares.token, token)).limit(1)
  )[0]
  if (!share) return null
  const node = (
    await db.select().from(schema.nodes).where(eq(schema.nodes.id, share.nodeId)).limit(1)
  )[0]
  if (!node || node.trashedAt || node.kind !== "file" || !node.storageKey) return null
  const owner = (
    await db
      .select({ name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, share.ownerId))
      .limit(1)
  )[0]
  return { share, node, ownerName: owner?.name ?? "Someone" }
}

export const shareExpired = (share: DriveShare): boolean =>
  Boolean(share.expiresAt && share.expiresAt.getTime() < Date.now())

export const shareLimitReached = (share: DriveShare): boolean =>
  share.maxDownloads != null && share.downloadCount >= share.maxDownloads

export const shareDownloadable = (share: DriveShare): boolean =>
  !shareExpired(share) && !shareLimitReached(share)

export const recordShareDownload = async (shareId: string): Promise<void> => {
  await db
    .update(schema.shares)
    .set({ downloadCount: sql`${schema.shares.downloadCount} + 1` })
    .where(eq(schema.shares.id, shareId))
}

/** A fresh storage key for a Drive object whose bytes are written out-of-band (e.g. multipart). */
export const newDriveStorageKey = (ownerId: string, filename: string): string =>
  driveObjectKey(ownerId, createId(), filename)

/** Create a Drive file node pointing at an already-stored object (chunked upload completion). */
export const createDriveFileFromStorage = async (input: {
  ownerId: string
  parentId: string
  filename: string
  mimeType: string
  storageKey: string
  sizeBytes: number
  encryptedName?: string | null
}): Promise<DriveNode> => {
  const inserted = await db
    .insert(schema.nodes)
    .values({
      ownerId: input.ownerId,
      parentId: input.parentId,
      kind: "file",
      name: input.filename,
      encryptedName: input.encryptedName ?? null,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageKey: input.storageKey,
    })
    .returning()
  return inserted[0]!
}

interface DriveFileInput {
  ownerId: string
  parentId: string
  filename: string
  mimeType: string
  bytes: Buffer
  encryptedName?: string | null
}

/**
 * Store a plain drive file, versioning on name collision: if a non-trashed file
 * with the same name already exists in the folder, snapshot it into `versions`
 * and overwrite the node in place; otherwise create a new node.
 */
export const upsertDriveFile = async (input: DriveFileInput): Promise<DriveNode> => {
  const existing = (
    await db
      .select()
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.ownerId, input.ownerId),
          eq(schema.nodes.parentId, input.parentId),
          eq(schema.nodes.name, input.filename),
          eq(schema.nodes.kind, "file"),
          isNull(schema.nodes.trashedAt),
        ),
      )
      .limit(1)
  )[0]
  if (!existing || !existing.storageKey || existing.photoAssetId) return ingestDriveFile(input)

  await db.insert(schema.versions).values({
    ownerId: input.ownerId,
    nodeId: existing.id,
    name: existing.name,
    storageKey: existing.storageKey,
    sizeBytes: existing.sizeBytes,
    mimeType: existing.mimeType,
  })
  const key = `users/${input.ownerId}/drive/${existing.id}-${createId()}${extname(input.filename)}`
  await storage().put({ key, body: input.bytes, contentType: input.mimeType })
  const updated = await db
    .update(schema.nodes)
    .set({
      storageKey: key,
      sizeBytes: input.bytes.length,
      mimeType: input.mimeType,
      updatedAt: new Date(),
    })
    .where(eq(schema.nodes.id, existing.id))
    .returning()
  return updated[0]!
}

export const listVersions = (ownerId: string, nodeId: string): Promise<DriveVersion[]> =>
  db
    .select()
    .from(schema.versions)
    .where(and(eq(schema.versions.ownerId, ownerId), eq(schema.versions.nodeId, nodeId)))
    .orderBy(desc(schema.versions.createdAt))

export const getVersion = async (
  ownerId: string,
  versionId: string,
): Promise<DriveVersion | null> => {
  const rows = await db
    .select()
    .from(schema.versions)
    .where(and(eq(schema.versions.ownerId, ownerId), eq(schema.versions.id, versionId)))
    .limit(1)
  return rows[0] ?? null
}

/** Make a prior version current, snapshotting the current bytes back into history first. */
export const restoreVersion = async (
  ownerId: string,
  nodeId: string,
  versionId: string,
): Promise<DriveNode> => {
  const node = await getNode(ownerId, nodeId)
  if (!node) throw new Error("not found")
  const version = (
    await db
      .select()
      .from(schema.versions)
      .where(
        and(
          eq(schema.versions.id, versionId),
          eq(schema.versions.ownerId, ownerId),
          eq(schema.versions.nodeId, nodeId),
        ),
      )
      .limit(1)
  )[0]
  if (!version) throw new Error("version not found")
  if (node.storageKey) {
    await db.insert(schema.versions).values({
      ownerId,
      nodeId,
      name: node.name,
      storageKey: node.storageKey,
      sizeBytes: node.sizeBytes,
      mimeType: node.mimeType,
    })
  }
  const updated = await db
    .update(schema.nodes)
    .set({
      storageKey: version.storageKey,
      sizeBytes: version.sizeBytes,
      mimeType: version.mimeType,
      updatedAt: new Date(),
    })
    .where(eq(schema.nodes.id, nodeId))
    .returning()
  await db.delete(schema.versions).where(eq(schema.versions.id, versionId))
  return updated[0]!
}

const DOC_MIME = "application/vnd.orbit.doc"
const SHEET_MIME = "application/vnd.orbit.sheet"
const BOARD_MIME = "application/vnd.orbit.board"

/** Which suite app a stored file belongs to, used for the storage breakdown. */
export type StorageApp = "photos" | "drive" | "docs" | "sheets" | "whiteboard"

const appForMime = (mime: string | null, photoAssetId: string | null): StorageApp => {
  if (mime === DOC_MIME) return "docs"
  if (mime === SHEET_MIME) return "sheets"
  if (mime === BOARD_MIME) return "whiteboard"
  if (photoAssetId || (mime && /^(image|video|audio)\//.test(mime))) return "photos"
  return "drive"
}

/** Coarse file-kind buckets for the library overview. */
export type StorageKind = "image" | "video" | "audio" | "document" | "archive" | "other"

const kindForMime = (mime: string | null): StorageKind => {
  if (!mime) return "other"
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  if (
    mime.startsWith("text/") ||
    mime === "application/pdf" ||
    mime.startsWith("application/vnd.orbit.") ||
    mime.startsWith("application/vnd.openxmlformats") ||
    mime.startsWith("application/vnd.oasis") ||
    mime === "application/msword" ||
    mime === "application/json"
  )
    return "document"
  if (/(zip|tar|gzip|x-7z|x-rar|x-bzip)/.test(mime)) return "archive"
  return "other"
}

export interface StorageStats {
  usedBytes: number
  quotaBytes: number | null
  breakdown: { app: StorageApp; bytes: number; count: number }[]
  kinds: { kind: StorageKind; bytes: number; count: number }[]
  largest: {
    id: string
    name: string
    encryptedName: string | null
    mimeType: string | null
    sizeBytes: number
    app: StorageApp
  }[]
}

/**
 * Account storage usage broken down by suite app, plus the largest individual files. The Drive
 * node table is the canonical store (Photos assets are mirrored as drive nodes), so summing
 * non-trashed file nodes gives one true total with no double counting.
 */
export const getStorageStats = async (ownerId: string): Promise<StorageStats> => {
  const files = await db
    .select({
      id: schema.nodes.id,
      name: schema.nodes.name,
      encryptedName: schema.nodes.encryptedName,
      mimeType: schema.nodes.mimeType,
      sizeBytes: schema.nodes.sizeBytes,
      photoAssetId: schema.nodes.photoAssetId,
    })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.ownerId, ownerId),
        eq(schema.nodes.kind, "file"),
        isNull(schema.nodes.trashedAt),
      ),
    )

  const totals = new Map<StorageApp, { bytes: number; count: number }>()
  const kindTotals = new Map<StorageKind, { bytes: number; count: number }>()
  let usedBytes = 0
  for (const file of files) {
    const bytes = file.sizeBytes ?? 0
    usedBytes += bytes
    const app = appForMime(file.mimeType, file.photoAssetId)
    const current = totals.get(app) ?? { bytes: 0, count: 0 }
    current.bytes += bytes
    current.count += 1
    totals.set(app, current)

    const kind = kindForMime(file.mimeType)
    const kindCurrent = kindTotals.get(kind) ?? { bytes: 0, count: 0 }
    kindCurrent.bytes += bytes
    kindCurrent.count += 1
    kindTotals.set(kind, kindCurrent)
  }

  const breakdown = [...totals.entries()]
    .map(([app, value]) => ({ app, bytes: value.bytes, count: value.count }))
    .sort((a, b) => b.bytes - a.bytes)

  const kinds = [...kindTotals.entries()]
    .map(([kind, value]) => ({ kind, bytes: value.bytes, count: value.count }))
    .sort((a, b) => b.bytes - a.bytes)

  const largest = [...files]
    .sort((a, b) => (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0))
    .slice(0, 24)
    .map((file) => ({
      id: file.id,
      name: file.name,
      encryptedName: file.encryptedName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes ?? 0,
      app: appForMime(file.mimeType, file.photoAssetId),
    }))

  const quota = await resolveLimit(ownerId, "storage.quota.bytes")
  return { usedBytes, quotaBytes: typeof quota === "number" ? quota : null, breakdown, kinds, largest }
}

export type LibraryView = "recent" | "kind" | "favorites"

/**
 * Flat, cross-folder file listings for the sidebar smart views: the most-recently-updated files
 * ("recent"), every file of a given storage kind ("kind"), or starred items ("favorites" — which
 * also includes folders, ordered by when they were favorited). The result is capped so a huge
 * library cannot return unbounded rows.
 */
export const listLibrary = async (
  ownerId: string,
  view: LibraryView,
  kind?: StorageKind,
  limit = 200,
): Promise<DriveNode[]> => {
  const conditions = [eq(schema.nodes.ownerId, ownerId), isNull(schema.nodes.trashedAt)]
  if (view === "favorites") conditions.push(isNotNull(schema.nodes.favoritedAt))
  else conditions.push(eq(schema.nodes.kind, "file"))
  const rows = await db
    .select()
    .from(schema.nodes)
    .where(and(...conditions))
    .orderBy(view === "favorites" ? desc(schema.nodes.favoritedAt) : desc(schema.nodes.updatedAt))
  const filtered =
    view === "kind" && kind ? rows.filter((node) => kindForMime(node.mimeType) === kind) : rows
  return filtered.slice(0, limit)
}

/** Star or unstar a node (favorites are a flat, cross-folder smart view). */
export const setFavorite = async (
  ownerId: string,
  nodeId: string,
  favorite: boolean,
): Promise<DriveNode> => {
  const node = await getNode(ownerId, nodeId)
  if (!node) throw new Error("node not found")
  const [updated] = await db
    .update(schema.nodes)
    .set({ favoritedAt: favorite ? new Date() : null })
    .where(and(eq(schema.nodes.ownerId, ownerId), eq(schema.nodes.id, nodeId)))
    .returning()
  return updated!
}
