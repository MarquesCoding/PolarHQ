import { createRequire } from "node:module"
import { Readable } from "node:stream"
import { config } from "@workspace/config"
import { publishUserEvent } from "@workspace/jobs"
import { assetObjectKeys, storage } from "@workspace/storage"
import type { Archiver, ArchiverOptions, Format } from "archiver"
import { type Context, Hono } from "hono"
import { z } from "zod"

const createArchive = createRequire(import.meta.url)("archiver") as (
  format: Format,
  options?: ArchiverOptions,
) => Archiver
import { getSessionUser } from "../context"
import { createShareForAsset } from "../drive/service"
import * as albums from "./albums"
import { serializeAsset, serializeGridAssets } from "./serialize"
import {
  type AssetView,
  getAsset,
  emptyTrash,
  getUsage,
  ingestUpload,
  listAssets,
  listProcessing,
  purgeAssets,
  restoreAssets,
  setFavorite,
  trashAsset,
  trashAssets,
} from "./service"
import * as tags from "./tags"

type Variables = { userId: string }

export const photosRoutes = new Hono<{ Variables: Variables }>()

photosRoutes.use("*", async (c, next) => {
  const user = await getSessionUser(c.req.raw.headers)
  if (!user) return c.json({ error: "unauthorized" }, 401)
  c.set("userId", user.id)
  await next()
})

const notify = (userId: string) =>
  publishUserEvent(userId, {
    type: "photos.asset.changed",
    scope: `user:${userId}`,
    payload: {},
  })

const parse = async <T>(c: Context, schema: z.ZodType<T>) => {
  const body = await c.req.json().catch(() => null)
  return schema.safeParse(body)
}

const assetIdsSchema = z.object({ assetIds: z.array(z.string()).min(1) })

photosRoutes.post("/assets", async (c) => {
  const body = await c.req.parseBody()
  const file = body["file"]
  if (!(file instanceof File)) return c.json({ error: "file field is required" }, 400)

  const bytes = Buffer.from(await file.arrayBuffer())
  const mtimeRaw = body["mtime"]
  const mtime = typeof mtimeRaw === "string" ? Number(mtimeRaw) : NaN
  const clientModifiedAt = Number.isFinite(mtime) && mtime > 0 ? new Date(mtime) : undefined

  const result = await ingestUpload({
    ownerId: c.get("userId"),
    filename: file.name || "upload",
    mimeType: file.type || "application/octet-stream",
    bytes,
    clientModifiedAt,
  })

  const asset = await serializeAsset(result.asset)
  return c.json({ asset, deduped: result.deduped }, result.deduped ? 200 : 201)
})

photosRoutes.get("/assets", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? "200") || 200, 500)
  const views: AssetView[] = ["library", "favourites", "trash"]
  const requested = c.req.query("view")
  const view = views.includes(requested as AssetView) ? (requested as AssetView) : "library"

  const page = await listAssets(c.get("userId"), {
    limit,
    cursor: c.req.query("cursor"),
    view,
    albumId: c.req.query("album"),
    tagId: c.req.query("tag"),
  })
  return c.json({ assets: serializeGridAssets(page.assets), nextCursor: page.nextCursor })
})

photosRoutes.get("/usage", async (c) => {
  return c.json(await getUsage(c.get("userId")))
})

photosRoutes.get("/assets/processing", async (c) => {
  return c.json({ assets: await listProcessing(c.get("userId")) })
})

photosRoutes.post("/assets/actions/favorite", async (c) => {
  const parsed = await parse(c, assetIdsSchema.extend({ favorite: z.boolean() }))
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  await setFavorite(c.get("userId"), parsed.data.assetIds, parsed.data.favorite)
  await notify(c.get("userId"))
  return c.json({ ok: true })
})

photosRoutes.post("/assets/actions/trash", async (c) => {
  const parsed = await parse(c, assetIdsSchema)
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  await trashAssets(c.get("userId"), parsed.data.assetIds)
  await notify(c.get("userId"))
  return c.json({ ok: true })
})

photosRoutes.post("/assets/actions/restore", async (c) => {
  const parsed = await parse(c, assetIdsSchema)
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  await restoreAssets(c.get("userId"), parsed.data.assetIds)
  await notify(c.get("userId"))
  return c.json({ ok: true })
})

photosRoutes.post("/assets/actions/delete", async (c) => {
  const parsed = await parse(c, assetIdsSchema)
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  await purgeAssets(c.get("userId"), parsed.data.assetIds)
  await notify(c.get("userId"))
  return c.json({ ok: true })
})

photosRoutes.post("/assets/actions/empty-trash", async (c) => {
  await emptyTrash(c.get("userId"))
  await notify(c.get("userId"))
  return c.json({ ok: true })
})

photosRoutes.post("/assets/:id/share", async (c) => {
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
  const share = await createShareForAsset(c.get("userId"), c.req.param("id"), {
    expiresAt,
    maxDownloads: options.maxDownloads ?? null,
  })
  if (!share) return c.json({ error: "not found" }, 404)
  return c.json({
    token: share.token,
    url: `${config.api.url}/s/${share.token}`,
    expiresAt: share.expiresAt,
    maxDownloads: share.maxDownloads,
    downloadCount: share.downloadCount,
  })
})

photosRoutes.get("/assets/:id", async (c) => {
  const asset = await getAsset(c.get("userId"), c.req.param("id"))
  if (!asset) return c.json({ error: "not found" }, 404)
  return c.json({ asset: await serializeAsset(asset) })
})

const streamObject = async (key: string, contentType: string): Promise<Response> => {
  const nodeStream = await storage().getStream(key)
  return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
    headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=86400" },
  })
}

const attachment = (filename: string): string => {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "")
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

const stampedName = (): string => {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return (
    `orbit-photos-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.zip`
  )
}

const uniqueName = (filename: string, used: Set<string>): string => {
  const safe = filename || "file"
  if (!used.has(safe)) {
    used.add(safe)
    return safe
  }
  const dot = safe.lastIndexOf(".")
  const base = dot > 0 ? safe.slice(0, dot) : safe
  const ext = dot > 0 ? safe.slice(dot) : ""
  let counter = 1
  while (used.has(`${base} (${counter})${ext}`)) counter += 1
  const result = `${base} (${counter})${ext}`
  used.add(result)
  return result
}

photosRoutes.get("/assets/:id/original", async (c) => {
  const asset = await getAsset(c.get("userId"), c.req.param("id"))
  if (!asset) return c.json({ error: "not found" }, 404)
  return streamObject(asset.storageKey, asset.mimeType)
})

photosRoutes.get("/assets/:id/download", async (c) => {
  const asset = await getAsset(c.get("userId"), c.req.param("id"))
  if (!asset) return c.json({ error: "not found" }, 404)
  const nodeStream = await storage().getStream(asset.storageKey)
  return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Disposition": attachment(asset.originalFilename),
    },
  })
})

photosRoutes.post("/assets/actions/download", async (c) => {
  const parsed = await parse(c, assetIdsSchema)
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  const userId = c.get("userId")
  const assets = (
    await Promise.all(parsed.data.assetIds.map((id) => getAsset(userId, id)))
  ).filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
  if (assets.length === 0) return c.json({ error: "not found" }, 404)

  const archive = createArchive("zip", { store: true })
  archive.on("error", (error: Error) => {
    console.error("[photos] zip stream error", error)
    archive.destroy()
  })

  const used = new Set<string>()
  await Promise.all(
    assets.map(async (asset) => {
      const stream = await storage().getStream(asset.storageKey)
      archive.append(stream, { name: uniqueName(asset.originalFilename, used) })
    }),
  )
  void archive.finalize()

  return new Response(Readable.toWeb(archive) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": attachment(stampedName()),
    },
  })
})

photosRoutes.get("/assets/:id/thumbnail", async (c) => {
  const asset = await getAsset(c.get("userId"), c.req.param("id"))
  if (!asset?.thumbnailKey) return c.json({ error: "not found" }, 404)
  return streamObject(asset.thumbnailKey, "image/webp")
})

photosRoutes.get("/assets/:id/preview", async (c) => {
  const asset = await getAsset(c.get("userId"), c.req.param("id"))
  if (!asset?.previewKey) return c.json({ error: "not found" }, 404)
  return streamObject(asset.previewKey, "image/webp")
})

photosRoutes.get("/assets/:id/video", async (c) => {
  const asset = await getAsset(c.get("userId"), c.req.param("id"))
  if (!asset || asset.type !== "video") return c.json({ error: "not found" }, 404)
  const playbackKey = assetObjectKeys(asset.ownerId, asset.id, "").video
  const stream = await storage()
    .getStream(playbackKey)
    .catch(() => storage().getStream(asset.storageKey))
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "private, max-age=86400",
      "Accept-Ranges": "bytes",
    },
  })
})

photosRoutes.delete("/assets/:id", async (c) => {
  const ok = await trashAsset(c.get("userId"), c.req.param("id"))
  if (!ok) return c.json({ error: "not found" }, 404)
  await notify(c.get("userId"))
  return c.json({ ok: true })
})

photosRoutes.get("/albums", async (c) => {
  return c.json({ albums: await albums.listAlbums(c.get("userId")) })
})

photosRoutes.post("/albums", async (c) => {
  const parsed = await parse(c, z.object({ name: z.string().min(1), description: z.string().optional() }))
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  const album = await albums.createAlbum(c.get("userId"), parsed.data.name, parsed.data.description)
  return c.json({ album }, 201)
})

photosRoutes.get("/albums/:id", async (c) => {
  const result = await albums.getAlbumWithAssets(c.get("userId"), c.req.param("id"))
  if (!result) return c.json({ error: "not found" }, 404)
  return c.json({ album: result.album, assets: serializeGridAssets(result.assets) })
})

photosRoutes.delete("/albums/:id", async (c) => {
  await albums.deleteAlbum(c.get("userId"), c.req.param("id"))
  return c.json({ ok: true })
})

photosRoutes.post("/albums/:id/assets", async (c) => {
  const parsed = await parse(c, assetIdsSchema)
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  await albums.addAssetsToAlbum(c.get("userId"), c.req.param("id"), parsed.data.assetIds)
  return c.json({ ok: true })
})

photosRoutes.delete("/albums/:id/assets", async (c) => {
  const parsed = await parse(c, assetIdsSchema)
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  await albums.removeAssetsFromAlbum(c.get("userId"), c.req.param("id"), parsed.data.assetIds)
  return c.json({ ok: true })
})

photosRoutes.get("/tags", async (c) => {
  return c.json({ tags: await tags.listTags(c.get("userId")) })
})

photosRoutes.post("/tags", async (c) => {
  const parsed = await parse(c, z.object({ name: z.string().min(1) }))
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  const tag = await tags.createTag(c.get("userId"), parsed.data.name)
  return c.json({ tag }, 201)
})

photosRoutes.delete("/tags/:id", async (c) => {
  await tags.deleteTag(c.get("userId"), c.req.param("id"))
  return c.json({ ok: true })
})

photosRoutes.post("/tags/:id/assets", async (c) => {
  const parsed = await parse(c, assetIdsSchema)
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  await tags.tagAssets(c.get("userId"), c.req.param("id"), parsed.data.assetIds)
  return c.json({ ok: true })
})

photosRoutes.delete("/tags/:id/assets", async (c) => {
  const parsed = await parse(c, assetIdsSchema)
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  await tags.untagAssets(c.get("userId"), c.req.param("id"), parsed.data.assetIds)
  return c.json({ ok: true })
})
