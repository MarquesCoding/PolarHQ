import { Readable } from "node:stream"
import { config } from "@workspace/config"
import { publishUserEvent } from "@workspace/jobs"
import { storage } from "@workspace/storage"
import { type Context, Hono } from "hono"
import { z } from "zod"
import { getSessionUser } from "../context"
import { nodesWithKeys } from "../docs/keys"
import { ingestUpload, purgeAssets, restoreAssets, trashAssets } from "../photos/service"
import {
  type DriveNode,
  type DriveShare,
  type DriveVersion,
  archiveNodes,
  breadcrumb,
  copyNode,
  createFolder,
  createShare,
  deleteNode,
  ensurePhotosDriveNode,
  ensureUserRoots,
  extractArchive,
  getNode,
  getVersion,
  isMediaMime,
  linkAssetNode,
  listChildren,
  listFolders,
  listTrash,
  listVersions,
  moveNode,
  purgeTrash,
  renameNode,
  restoreNodeTree,
  restoreVersion,
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

const driveBase = `${config.api.url}/api/v1/drive/nodes`
const photosBase = `${config.api.url}/api/v1/photos/assets`

const serializeNode = (node: DriveNode, encryptedIds?: Set<string>) => ({
  id: node.id,
  parentId: node.parentId,
  kind: node.kind,
  name: node.name,
  mimeType: node.mimeType,
  sizeBytes: node.sizeBytes,
  special: node.special,
  photoAssetId: node.photoAssetId,
  encrypted: encryptedIds?.has(node.id) ?? false,
  trashedAt: node.trashedAt,
  createdAt: node.createdAt,
  updatedAt: node.updatedAt,
  downloadUrl: node.kind === "file" ? `${driveBase}/${node.id}/download` : null,
  thumbnailUrl: node.photoAssetId
    ? `${photosBase}/${node.photoAssetId}/thumbnail?u=${node.updatedAt.getTime()}`
    : null,
})

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

driveRoutes.post("/nodes/folder", async (c) => {
  const parsed = await parse(
    c,
    z.object({ parentId: z.string().nullish(), name: z.string().min(1) }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  const node = await createFolder(c.get("userId"), parsed.data.parentId ?? null, parsed.data.name)
  return c.json({ node: serializeNode(node) }, 201)
})

driveRoutes.post("/nodes/upload", async (c) => {
  const userId = c.get("userId")
  const body = await c.req.parseBody()
  const file = body["file"]
  if (!(file instanceof File)) return c.json({ error: "file field is required" }, 400)

  const parentRaw = typeof body["parentId"] === "string" ? body["parentId"] : null
  const { rootId, photosId } = await ensureUserRoots(userId)
  const parentId = parentRaw && parentRaw !== "root" ? parentRaw : rootId

  const bytes = Buffer.from(await file.arrayBuffer())
  const filename = file.name || "file"
  const mimeType = file.type || "application/octet-stream"
  const mtimeRaw = body["mtime"]
  const mtime = typeof mtimeRaw === "string" ? Number(mtimeRaw) : NaN
  const clientModifiedAt = Number.isFinite(mtime) && mtime > 0 ? new Date(mtime) : undefined

  // E2E upload: the body is ciphertext. Store it as-is with the original mime (sent
  // separately) and never run server-side media processing — the client owns the thumbnail.
  if (body["encrypted"] === "true") {
    const originalMime = typeof body["mimeType"] === "string" ? body["mimeType"] : mimeType
    const node = await upsertDriveFile({ ownerId: userId, parentId, filename, mimeType: originalMime, bytes })
    return c.json({ node: serializeNode(node) }, 201)
  }

  if (parentId === photosId) {
    if (!isMediaMime(mimeType)) {
      return c.json({ error: "The Photos folder only accepts images, video, and audio" }, 400)
    }
    const result = await ingestUpload({ ownerId: userId, filename, mimeType, bytes, clientModifiedAt })
    const node = await ensurePhotosDriveNode(userId, {
      id: result.asset.id,
      originalFilename: result.asset.originalFilename,
      mimeType: result.asset.mimeType,
      sizeBytes: result.asset.sizeBytes,
      storageKey: result.asset.storageKey,
    })
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
    return c.json({ node: serializeNode(node), registeredInPhotos: true }, 201)
  }

  const node = await upsertDriveFile({ ownerId: userId, parentId, filename, mimeType, bytes })
  return c.json({ node: serializeNode(node) }, 201)
})

// Encrypted thumbnail blobs (client-generated, stored opaque under the user's .thumbnails).
driveRoutes.put("/nodes/:id/thumbnail", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "not found" }, 404)
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
  if (!node) return c.json({ error: "not found" }, 404)
  const stream = await storage()
    .getStream(`users/${userId}/.thumbnails/${node.id}`)
    .catch(() => null)
  if (!stream) return c.json({ error: "not found" }, 404)
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
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
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
  if (!node) return c.json({ error: "not found" }, 404)
  try {
    const folder = await extractArchive(userId, node.id)
    return c.json({ node: serializeNode(folder) }, 201)
  } catch {
    return c.json({ error: "could not extract archive" }, 400)
  }
})

driveRoutes.get("/folders", async (c) => {
  const folders = await listFolders(c.get("userId"))
  return c.json({ folders: folders.map((n) => serializeNode(n)) })
})

driveRoutes.post("/nodes/:id/copy", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "not found" }, 404)
  const copy = await copyNode(userId, node.id)
  return c.json({ node: serializeNode(copy) }, 201)
})

driveRoutes.post("/nodes/:id/share", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "not found" }, 404)
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
  if (!node) return c.json({ error: "not found" }, 404)
  return c.json({ node: serializeNode(node) })
})

driveRoutes.get("/nodes/:id/versions/:versionId/download", async (c) => {
  const version = await getVersion(c.get("userId"), c.req.param("versionId"))
  if (!version || version.nodeId !== c.req.param("id")) return c.json({ error: "not found" }, 404)
  const stream = await storage().getStream(version.storageKey)
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": version.mimeType ?? "application/octet-stream",
      "Content-Disposition": attachment(version.name),
    },
  })
})

driveRoutes.patch("/nodes/:id", async (c) => {
  const parsed = await parse(
    c,
    z.object({ name: z.string().min(1).optional(), parentId: z.string().optional() }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  const userId = c.get("userId")
  const id = c.req.param("id")
  const node = await getNode(userId, id)
  if (!node) return c.json({ error: "not found" }, 404)
  if (node.special) return c.json({ error: "cannot modify a system folder" }, 400)
  if (parsed.data.name) await renameNode(userId, id, parsed.data.name)
  if (parsed.data.parentId) {
    const { rootId, photosId } = await ensureUserRoots(userId)
    const targetId = parsed.data.parentId === "root" ? rootId : parsed.data.parentId
    if (targetId === photosId && node.kind === "file" && !isMediaMime(node.mimeType ?? "")) {
      return c.json({ error: "The Photos folder only accepts media files" }, 400)
    }
    await moveNode(userId, id, parsed.data.parentId)
  }
  return c.json({ ok: true })
})

driveRoutes.get("/trash", async (c) => {
  const nodes = await listTrash(c.get("userId"))
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
  if (!node) return c.json({ error: "not found" }, 404)
  if (node.special) return c.json({ error: "cannot delete a system folder" }, 400)
  const { trashedAssetIds } = await trashNodeTree(userId, node.id)
  if (trashedAssetIds.length > 0) await trashAssets(userId, trashedAssetIds)
  return c.json({ ok: true })
})

driveRoutes.post("/nodes/:id/restore", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "not found" }, 404)
  const { restoredAssetIds } = await restoreNodeTree(userId, node.id)
  if (restoredAssetIds.length > 0) await restoreAssets(userId, restoredAssetIds)
  return c.json({ ok: true })
})

driveRoutes.delete("/nodes/:id", async (c) => {
  const userId = c.get("userId")
  const node = await getNode(userId, c.req.param("id"))
  if (!node) return c.json({ error: "not found" }, 404)
  if (node.special) return c.json({ error: "cannot delete a system folder" }, 400)
  const { removedAssetIds } = await deleteNode(userId, node.id)
  if (removedAssetIds.length > 0) await purgeAssets(userId, removedAssetIds)
  return c.json({ ok: true })
})

driveRoutes.get("/nodes/:id/download", async (c) => {
  const node = await getNode(c.get("userId"), c.req.param("id"))
  if (!node || node.kind !== "file" || !node.storageKey) return c.json({ error: "not found" }, 404)
  const stream = await storage().getStream(node.storageKey)
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": node.mimeType ?? "application/octet-stream",
      "Content-Disposition": attachment(node.name),
    },
  })
})
