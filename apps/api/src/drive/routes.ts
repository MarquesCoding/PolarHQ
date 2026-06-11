import { Readable } from "node:stream"
import { resolveLimit } from "@workspace/auth"
import { config } from "@workspace/config"
import { createId } from "@paralleldrive/cuid2"
import { publishUserEvent } from "@workspace/jobs"
import { storage } from "@workspace/storage"
import { type Context, Hono } from "hono"
import { z } from "zod"
import { getSessionUser } from "../context"
import { formatBytes, readUploadForm } from "../uploads"
import {
  deleteUploadSession,
  getUploadSession,
  saveUploadSession,
  type UploadSession,
} from "./uploadSession"
import { nodesWithKeys } from "../docs/keys"
import { ingestUpload, purgeAssets, restoreAssets, trashAssets } from "../photos/service"
import {
  type DriveNode,
  type DriveShare,
  type DriveVersion,
  type StorageKind,
  archiveNodes,
  breadcrumb,
  clearNodeLock,
  copyNode,
  createDriveFileFromStorage,
  createFolder,
  createShare,
  deleteNode,
  newDriveStorageKey,
  ensurePhotosDriveNode,
  ensureUserRoots,
  extractArchive,
  getNode,
  getStorageStats,
  getNodeLock,
  setNodeLock,
  getVersion,
  isMediaMime,
  linkAssetNode,
  listChildren,
  listFolders,
  listLibrary,
  listTrash,
  purgeExpiredTrash,
  listVersions,
  moveNode,
  purgeTrash,
  renameNode,
  restoreNodeTree,
  restoreVersion,
  setFavorite,
  trashNodeTree,
  upsertDriveFile,
} from "./service"

type Variables = { userId: string }

export const driveRoutes = new Hono<{ Variables: Variables }>()

driveRoutes.use("*", async (c, next) => {
  const user = await getSessionUser(c.req.raw.headers)
  if (!user) return c.json({ error: "unauthorized" }, 401)
  c.set("userId", user.id)
  await next()
})

/** Broadcast a Drive change to the user's other sessions/devices for live sync. */
const notify = (userId: string) =>
  publishUserEvent(userId, { type: "drive.node.changed", scope: `user:${userId}`, payload: {} })

const driveBase = `${config.api.url}/api/v1/drive/nodes`
const photosBase = `${config.api.url}/api/v1/photos/assets`

const serializeNode = (node: DriveNode, encryptedIds?: Set<string>) => {
  const encrypted = encryptedIds?.has(node.id) ?? false
  return {
    id: node.id,
    parentId: node.parentId,
    kind: node.kind,
    name: node.name,
    encryptedName: node.encryptedName,
    sharedName: node.sharedName,
    mimeType: node.mimeType,
    sizeBytes: node.sizeBytes,
    special: node.special,
    photoAssetId: node.photoAssetId,
    encrypted,
    locked: Boolean(node.lockVerifier),
    favorite: Boolean(node.favoritedAt),
    trashedAt: node.trashedAt,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    downloadUrl: node.kind === "file" ? `${driveBase}/${node.id}/download` : null,
    thumbnailUrl:
      node.photoAssetId && !encrypted
        ? `${photosBase}/${node.photoAssetId}/thumbnail?u=${node.updatedAt.getTime()}`
        : null,
  }
}

const serializeShare = (share: DriveShare) => ({
  token: share.token,
  url: `${config.api.url}/s/${share.token}`,
  expiresAt: share.expiresAt,
  maxDownloads: share.maxDownloads,
  downloadCount: share.downloadCount,
})

const serializeVersion = (version: DriveVersion) => ({
  id: version.id,
  name: version.name,
  sizeBytes: version.sizeBytes,
  mimeType: version.mimeType,
  createdAt: version.createdAt,
  downloadUrl: `${driveBase}/${version.nodeId}/versions/${version.id}/download`,
})

const attachment = (filename: string): string => {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "")
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

const parse = async <T>(c: Context, schema: z.ZodType<T>) => {
  const body = await c.req.json().catch(() => null)
  return schema.safeParse(body)
}

driveRoutes.get("/nodes", async (c) => {
  const userId = c.get("userId")
  const { parent, children } = await listChildren(userId, c.req.query("parent") ?? null)
  const trail = await breadcrumb(userId, parent.id)
  const encrypted = await nodesWithKeys(userId, children.map((n) => n.id))
  return c.json({
    parent: serializeNode(parent),
    breadcrumb: trail.map((n) => serializeNode(n)),
    children: children.map((n) => serializeNode(n, encrypted)),
  })
})

driveRoutes.get("/storage", async (c) => {
  return c.json(await getStorageStats(c.get("userId")))
})

driveRoutes.get("/library", async (c) => {
  const userId = c.get("userId")
  const view = c.req.query("view")
  if (view !== "recent" && view !== "kind" && view !== "favorites")
    return c.json({ error: "drive.library.invalidView" }, 400)
  const kind = c.req.query("kind") as StorageKind | undefined
  const nodes = await listLibrary(userId, view, kind)
  const encrypted = await nodesWithKeys(
    userId,
    nodes.map((n) => n.id),
  )
  return c.json({ children: nodes.map((n) => serializeNode(n, encrypted)) })
})

driveRoutes.post("/nodes/:id/favorite", async (c) => {
  const userId = c.get("userId")
  const parsed = await parse(c, z.object({ favorite: z.boolean() }))
  if (!parsed.success) return c.json({ error: "drive.favorite.invalid" }, 400)
  const node = await setFavorite(userId, c.req.param("id"), parsed.data.favorite)
  notify(userId)
  return c.json({ node: serializeNode(node) })
})

driveRoutes.post("/nodes/folder", async (c) => {
  const parsed = await parse(
    c,
    z.object({
      parentId: z.string().nullish(),
      name: z.string().min(1),
      encryptedName: z.string().nullish(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  const node = await createFolder(
    c.get("userId"),
    parsed.data.parentId ?? null,
    parsed.data.name,
    parsed.data.encryptedName ?? null,
  )
  await notify(c.get("userId"))
  return c.json({ node: serializeNode(node) }, 201)
})

driveRoutes.post("/nodes/upload", async (c) => {
  const userId = c.get("userId")
  const form = await readUploadForm(c, userId)
  if (form instanceof Response) return form
  const file = form.get("file")
  if (!(file instanceof File)) return c.json({ error: "drive.fileRequired" }, 400)

  const parentRaw = form.get("parentId")
  const { rootId, photosId } = await ensureUserRoots(userId)
  const parentId =
    typeof parentRaw === "string" && parentRaw !== "root" ? parentRaw : rootId

  const bytes = Buffer.from(await file.arrayBuffer())
  const filename = file.name || "file"
  const mimeType = file.type || "application/octet-stream"
  const mtimeRaw = form.get("mtime")
  const mtime = typeof mtimeRaw === "string" ? Number(mtimeRaw) : NaN
  const clientModifiedAt = Number.isFinite(mtime) && mtime > 0 ? new Date(mtime) : undefined

  if (form.get("encrypted") === "true") {
    const originalMimeRaw = form.get("mimeType")
    const originalMime = typeof originalMimeRaw === "string" ? originalMimeRaw : mimeType
    const encryptedNameRaw = form.get("encryptedName")
    const encryptedName = typeof encryptedNameRaw === "string" ? encryptedNameRaw : null
    const node = await upsertDriveFile({
      ownerId: userId,
      parentId,
      filename,
      mimeType: originalMime,
      bytes,
      encryptedName,
    })
    await notify(userId)
    return c.json({ node: serializeNode(node) }, 201)
  }

  if (parentId === photosId) {
    if (!isMediaMime(mimeType)) {
      return c.json({ error: "drive.photosMediaOnly" }, 400)
    }
    const result = await ingestUpload({ ownerId: userId, filename, mimeType, bytes, clientModifiedAt })
    const node = await ensurePhotosDriveNode(userId, {
      id: result.asset.id,
      originalFilename: result.asset.originalFilename,
      mimeType: result.asset.mimeType,
      sizeBytes: result.asset.sizeBytes,
      storageKey: result.asset.storageKey,
    })
    await notify(userId)
    return c.json({ node: serializeNode(node), registeredInPhotos: true }, 201)
  }

  if (isMediaMime(mimeType)) {
    const result = await ingestUpload({
      ownerId: userId,
      filename,
      mimeType,
      bytes,
      clientModifiedAt,
      inLibrary: false,
    })
    const node = await linkAssetNode(userId, parentId, {
      id: result.asset.id,
      originalFilename: result.asset.originalFilename,
      mimeType: result.asset.mimeType,
      sizeBytes: result.asset.sizeBytes,
      storageKey: result.asset.storageKey,
    })
    await notify(userId)
    return c.json({ node: serializeNode(node), registeredInPhotos: true }, 201)
  }

  const node = await upsertDriveFile({ ownerId: userId, parentId, filename, mimeType, bytes })
  return c.json({ node: serializeNode(node) }, 201)
})

driveRoutes.post("/nodes/upload/initiate", async (c) => {
  const userId = c.get("userId")
  const parsed = await parse(
    c,
    z.object({
      parentId: z.string().nullish(),
      filename: z.string().min(1),
      mimeType: z.string().min(1),
      encryptedName: z.string().nullish(),
      totalSize: z.number().int().nonnegative(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)

  const maxBytes = await resolveLimit(userId, "upload.maxFileBytes")
  if (typeof maxBytes === "number" && parsed.data.totalSize > maxBytes) {
    return c.json({ error: "uploads.tooLarge", errorParams: { limit: formatBytes(maxBytes) } }, 413)
  }

  const { rootId } = await ensureUserRoots(userId)
  const parentId =
    parsed.data.parentId && parsed.data.parentId !== "root" ? parsed.data.parentId : rootId
  const storageKey = newDriveStorageKey(userId, parsed.data.filename)
  const multipartUploadId = await storage().createMultipart(storageKey, "application/octet-stream")

  const sessionId = createId()
  const session: UploadSession = {
    ownerId: userId,
    parentId,
    filename: parsed.data.filename,
    mimeType: parsed.data.mimeType,
    encryptedName: parsed.data.encryptedName ?? null,
    storageKey,
    multipartUploadId,
    parts: [],
    bytes: 0,
  }
  await saveUploadSession(sessionId, session)
  return c.json({ sessionId }, 201)
})

driveRoutes.post("/nodes/upload/:sessionId/part", async (c) => {
  const userId = c.get("userId")
  const session = await getUploadSession(c.req.param("sessionId"))
  if (!session || session.ownerId !== userId) return c.json({ error: "notFound" }, 404)

  const partNumber = Number(c.req.query("part"))
  if (!Number.isInteger(partNumber) || partNumber < 1) return c.json({ error: "invalidInput" }, 400)

  const body = Buffer.from(await c.req.arrayBuffer())
  const part = await storage().uploadPart(
    session.storageKey,
    session.multipartUploadId,
    partNumber,
    body,
  )
  const isNewPart = !session.parts.some((existing) => existing.partNumber === partNumber)
  session.parts = session.parts.filter((existing) => existing.partNumber !== partNumber)
  session.parts.push(part)
  if (isNewPart) session.bytes += body.length
  await saveUploadSession(c.req.param("sessionId"), session)
  return c.json({ ok: true })
})

driveRoutes.post("/nodes/upload/:sessionId/complete", async (c) => {
  const userId = c.get("userId")
  const sessionId = c.req.param("sessionId")
  const session = await getUploadSession(sessionId)
  if (!session || session.ownerId !== userId) return c.json({ error: "notFound" }, 404)
  if (session.parts.length === 0) return c.json({ error: "invalidInput" }, 400)

  await storage().completeMultipart(session.storageKey, session.multipartUploadId, session.parts)
  const node = await createDriveFileFromStorage({
    ownerId: userId,
    parentId: session.parentId,
    filename: session.filename,
    mimeType: session.mimeType,
    storageKey: session.storageKey,
    sizeBytes: session.bytes,
    encryptedName: session.encryptedName,
  })
  await deleteUploadSession(sessionId)
  await notify(userId)
  return c.json({ node: serializeNode(node) }, 201)
})

driveRoutes.post("/nodes/upload/:sessionId/abort", async (c) => {
  const userId = c.get("userId")
  const sessionId = c.req.param("sessionId")
  const session = await getUploadSession(sessionId)
  if (!session || session.ownerId !== userId) return c.json({ ok: true })
  await storage()
    .abortMultipart(session.storageKey, session.multipartUploadId)
    .catch(() => undefined)
  await deleteUploadSession(sessionId)
  return c.json({ ok: true })
})

driveRoutes.put("/nodes/:id/thumbnail", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "notFound" }, 404)
  const bytes = Buffer.from(await c.req.arrayBuffer())
  await storage().put({
    key: `users/${userId}/.thumbnails/${node.id}`,
    body: bytes,
    contentType: "application/octet-stream",
  })
  return c.json({ ok: true })
})

driveRoutes.get("/nodes/:id/thumbnail", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "notFound" }, 404)
  const stream = await storage()
    .getStream(`users/${userId}/.thumbnails/${node.id}`)
    .catch(() => null)
  if (!stream) return c.json({ error: "notFound" }, 404)
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store" },
  })
})

driveRoutes.post("/nodes/archive", async (c) => {
  const userId = c.get("userId")
  const parsed = await parse(
    c,
    z.object({
      nodeIds: z.array(z.string()).min(1),
      parentId: z.string().nullish(),
      archiveId: z.string().optional(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  const { rootId } = await ensureUserRoots(userId)
  const parentId =
    parsed.data.parentId && parsed.data.parentId !== "root" ? parsed.data.parentId : rootId

  const archiveId = parsed.data.archiveId
  const onProgress = archiveId
    ? (done: number, total: number) =>
        void publishUserEvent(userId, {
          type: "drive.archive.progress",
          scope: `user:${userId}`,
          payload: { archiveId, done, total },
        })
    : undefined

  const node = await archiveNodes(userId, parsed.data.nodeIds, parentId, onProgress)
  return c.json({ node: serializeNode(node) }, 201)
})

driveRoutes.post("/nodes/:id/extract", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "notFound" }, 404)
  try {
    const folder = await extractArchive(userId, node.id)
    return c.json({ node: serializeNode(folder) }, 201)
  } catch {
    return c.json({ error: "drive.extractFailed" }, 400)
  }
})

driveRoutes.get("/folders", async (c) => {
  const folders = await listFolders(c.get("userId"))
  return c.json({ folders: folders.map((n) => serializeNode(n)) })
})

driveRoutes.post("/nodes/:id/copy", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "notFound" }, 404)
  const copy = await copyNode(userId, node.id)
  return c.json({ node: serializeNode(copy) }, 201)
})

driveRoutes.post("/nodes/:id/share", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "notFound" }, 404)
  const parsed = await parse(
    c,
    z.object({
      expiresInHours: z.number().positive().nullish(),
      maxDownloads: z.number().int().positive().nullish(),
    }),
  )
  const options = parsed.success ? parsed.data : {}
  const expiresAt = options.expiresInHours
    ? new Date(Date.now() + options.expiresInHours * 3600_000)
    : null
  const share = await createShare(userId, node.id, {
    expiresAt,
    maxDownloads: options.maxDownloads ?? null,
  })
  return c.json(serializeShare(share))
})

driveRoutes.get("/nodes/:id/versions", async (c) => {
  const versions = await listVersions(c.get("userId"), c.req.param("id"))
  return c.json({ versions: versions.map(serializeVersion) })
})

driveRoutes.post("/nodes/:id/versions/:versionId/restore", async (c) => {
  const userId = c.get("userId")
  const node = await restoreVersion(userId, c.req.param("id"), c.req.param("versionId")).catch(
    () => null,
  )
  if (!node) return c.json({ error: "notFound" }, 404)
  return c.json({ node: serializeNode(node) })
})

driveRoutes.get("/nodes/:id/versions/:versionId/download", async (c) => {
  const version = await getVersion(c.get("userId"), c.req.param("versionId"))
  if (!version || version.nodeId !== c.req.param("id")) return c.json({ error: "notFound" }, 404)
  const stream = await storage().getStream(version.storageKey)
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": version.mimeType ?? "application/octet-stream",
      "Content-Disposition": attachment(version.name),
    },
  })
})

driveRoutes.get("/nodes/:id/lock", async (c) => {
  const lock = await getNodeLock(c.get("userId"), c.req.param("id"))
  if (!lock) return c.json({ error: "notFound" }, 404)
  return c.json(lock)
})

driveRoutes.post("/nodes/:id/lock", async (c) => {
  const parsed = await parse(c, z.object({ salt: z.string(), verifier: z.string() }))
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  const ok = await setNodeLock(c.get("userId"), c.req.param("id"), parsed.data.salt, parsed.data.verifier)
  if (!ok) return c.json({ error: "drive.cannotLockFolder" }, 400)
  return c.json({ ok: true })
})

driveRoutes.delete("/nodes/:id/lock", async (c) => {
  await clearNodeLock(c.get("userId"), c.req.param("id"))
  return c.json({ ok: true })
})

driveRoutes.patch("/nodes/:id", async (c) => {
  const parsed = await parse(
    c,
    z.object({
      name: z.string().min(1).optional(),
      encryptedName: z.string().nullish(),
      sharedName: z.string().nullish(),
      parentId: z.string().optional(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  const userId = c.get("userId")
  const id = c.req.param("id")
  const node = await getNode(userId, id)
  if (!node) return c.json({ error: "notFound" }, 404)
  if (node.special) return c.json({ error: "drive.cannotModifySystemFolder" }, 400)
  if (parsed.data.name)
    await renameNode(
      userId,
      id,
      parsed.data.name,
      parsed.data.encryptedName,
      parsed.data.sharedName,
    )
  if (parsed.data.parentId) {
    const { rootId, photosId } = await ensureUserRoots(userId)
    const targetId = parsed.data.parentId === "root" ? rootId : parsed.data.parentId
    if (targetId === photosId && node.kind === "file" && !isMediaMime(node.mimeType ?? "")) {
      return c.json({ error: "drive.photosMediaFilesOnly" }, 400)
    }
    await moveNode(userId, id, parsed.data.parentId)
  }
  await notify(userId)
  return c.json({ ok: true })
})

driveRoutes.get("/trash", async (c) => {
  const userId = c.get("userId")
  const { removedAssetIds } = await purgeExpiredTrash(userId)
  if (removedAssetIds.length > 0) await purgeAssets(userId, removedAssetIds)
  const nodes = await listTrash(userId)
  return c.json({ children: nodes.map((n) => serializeNode(n)) })
})

driveRoutes.post("/trash/empty", async (c) => {
  const userId = c.get("userId")
  const { removedAssetIds } = await purgeTrash(userId)
  if (removedAssetIds.length > 0) await purgeAssets(userId, removedAssetIds)
  return c.json({ ok: true })
})

driveRoutes.post("/nodes/:id/trash", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "notFound" }, 404)
  if (node.special) return c.json({ error: "drive.cannotDeleteSystemFolder" }, 400)
  const { trashedAssetIds } = await trashNodeTree(userId, node.id)
  if (trashedAssetIds.length > 0) await trashAssets(userId, trashedAssetIds)
  await notify(userId)
  return c.json({ ok: true })
})

driveRoutes.post("/nodes/:id/restore", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "notFound" }, 404)
  const { restoredAssetIds } = await restoreNodeTree(userId, node.id)
  if (restoredAssetIds.length > 0) await restoreAssets(userId, restoredAssetIds)
  await notify(userId)
  return c.json({ ok: true })
})

driveRoutes.delete("/nodes/:id", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "notFound" }, 404)
  if (node.special) return c.json({ error: "drive.cannotDeleteSystemFolder" }, 400)
  const { removedAssetIds } = await deleteNode(userId, node.id)
  if (removedAssetIds.length > 0) await purgeAssets(userId, removedAssetIds)
  await notify(userId)
  return c.json({ ok: true })
})

driveRoutes.get("/nodes/:id/download", async (c) => {
  const node = await getNode(c.get("userId"), c.req.param("id"))
  if (!node || node.kind !== "file" || !node.storageKey) return c.json({ error: "notFound" }, 404)
  const stream = await storage().getStream(node.storageKey)
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": node.mimeType ?? "application/octet-stream",
      "Content-Disposition": attachment(node.name),
    },
  })
})
