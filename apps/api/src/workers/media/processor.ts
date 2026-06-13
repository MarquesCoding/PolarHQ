import { createRequire } from "node:module"
import { extname } from "node:path"
import { db, schema } from "@polarhq/db"
import { publishUserEvent } from "@polarhq/jobs"
import { assetObjectKeys, storage } from "@polarhq/storage"
import { eq } from "drizzle-orm"
import exifr from "exifr"
import sharp from "sharp"
import { extractPoster, probeVideo, transcodeToMp4 } from "./ffmpeg"

/**
 * The prebuilt sharp can't decode HEIC/HEIF and this ffmpeg lacks libheif, so
 * decode via heic-convert (libheif WASM) to a JPEG that sharp can thumbnail.
 */
const heicConvert = createRequire(import.meta.url)("heic-convert") as (input: {
  buffer: Buffer
  format: "JPEG" | "PNG"
  quality?: number
}) => Promise<Buffer>

interface CuratedExif {
  make?: string
  model?: string
  lens?: string
  iso?: number
  fNumber?: number
  exposureTime?: number
  focalLength?: number
  focalLengthIn35mm?: number
  orientation?: number
  flash?: string | number
  exposureProgram?: string | number
  meteringMode?: string | number
  whiteBalance?: string | number
  exposureCompensation?: number
  software?: string
}

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined

const str = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined

const strOrNum = (value: unknown): string | number | undefined => str(value) ?? num(value)

const curateExif = (exif: Record<string, unknown> | undefined): CuratedExif | null => {
  if (!exif) return null
  const curated: CuratedExif = {
    make: str(exif.Make),
    model: str(exif.Model),
    lens: str(exif.LensModel) ?? str(exif.Lens),
    iso: num(exif.ISO),
    fNumber: num(exif.FNumber),
    exposureTime: num(exif.ExposureTime),
    focalLength: num(exif.FocalLength),
    focalLengthIn35mm: num(exif.FocalLengthIn35mmFormat),
    orientation: num(exif.Orientation),
    flash: strOrNum(exif.Flash),
    exposureProgram: strOrNum(exif.ExposureProgram),
    meteringMode: strOrNum(exif.MeteringMode),
    whiteBalance: strOrNum(exif.WhiteBalance),
    exposureCompensation: num(exif.ExposureCompensation) ?? num(exif.ExposureBiasValue),
    software: str(exif.Software),
  }
  return curated
}

const toDate = (value: unknown): Date | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

/**
 * Process a freshly-uploaded asset: extract dimensions + EXIF, generate
 * thumbnail and preview derivatives, persist them, and emit a ready event.
 * Reused by both the BullMQ worker and integration tests.
 */
export const processAsset = async (assetId: string): Promise<void> => {
  const rows = await db.select().from(schema.assets).where(eq(schema.assets.id, assetId)).limit(1)
  const asset = rows[0]
  if (!asset) {
    console.warn(`media: asset ${assetId} no longer exists, skipping`)
    return
  }

  try {
    if (asset.type === "video") await processVideo(asset)
    else if (asset.type === "audio") await processAudio(asset)
    else await processImage(asset)
  } catch (error) {
    console.error(`media: failed to process ${asset.id}`, error)
    await db
      .update(schema.assets)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(schema.assets.id, asset.id))
    await publishUserEvent(asset.ownerId, {
      type: "photos.asset.failed",
      scope: `user:${asset.ownerId}`,
      payload: { assetId: asset.id },
    })
  }
}

type AssetRow = typeof schema.assets.$inferSelect

const isHeic = (asset: AssetRow): boolean => {
  const mime = asset.mimeType.toLowerCase()
  return (
    mime.includes("heic") ||
    mime.includes("heif") ||
    /\.(heic|heif)$/i.test(asset.originalFilename)
  )
}

const readyEvent = async (asset: AssetRow) => {
  await db
    .update(schema.nodes)
    .set({ updatedAt: new Date() })
    .where(eq(schema.nodes.photoAssetId, asset.id))
    .catch(() => undefined)
  await publishUserEvent(asset.ownerId, {
    type: "photos.asset.thumbnail.ready",
    scope: `user:${asset.ownerId}`,
    payload: { assetId: asset.id },
  })
}

const processImage = async (asset: AssetRow): Promise<void> => {
  const assetId = asset.id
  const original = await storage().get(asset.storageKey)
  const keys = assetObjectKeys(asset.ownerId, asset.id, "")

  const decoded = isHeic(asset)
    ? await heicConvert({ buffer: original, format: "JPEG", quality: 1 })
    : original

  const meta = await sharp(decoded, { failOn: "none" }).metadata()
  const orientation = meta.orientation ?? 1
  const swapDimensions = orientation >= 5
  const width = (swapDimensions ? meta.height : meta.width) ?? null
  const height = (swapDimensions ? meta.width : meta.height) ?? null

  const exif = (await exifr
    .parse(original, { gps: true })
    .catch(() => undefined)) as Record<string, unknown> | undefined

  const thumbnail = await sharp(decoded, { failOn: "none" })
    .rotate()
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()

  const preview = await sharp(decoded, { failOn: "none" })
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()

  await storage().put({ key: keys.thumbnail, body: thumbnail, contentType: "image/webp" })
  await storage().put({ key: keys.preview, body: preview, contentType: "image/webp" })

  await db
    .update(schema.assets)
    .set({
      status: "ready",
      width,
      height,
      thumbnailKey: keys.thumbnail,
      previewKey: keys.preview,
      takenAt: toDate(exif?.DateTimeOriginal ?? exif?.CreateDate) ?? asset.takenAt,
      latitude: typeof exif?.latitude === "number" ? exif.latitude : null,
      longitude: typeof exif?.longitude === "number" ? exif.longitude : null,
      cameraMake: typeof exif?.Make === "string" ? exif.Make : null,
      cameraModel: typeof exif?.Model === "string" ? exif.Model : null,
      exif: curateExif(exif),
      updatedAt: new Date(),
    })
    .where(eq(schema.assets.id, assetId))

  await readyEvent(asset)
}

const processVideo = async (asset: AssetRow): Promise<void> => {
  const original = await storage().get(asset.storageKey)
  const keys = assetObjectKeys(asset.ownerId, asset.id, "")
  const ext = extname(asset.originalFilename) || ".mp4"

  const probe = await probeVideo(original, ext)
  const poster = await extractPoster(original, ext)
  const thumbnail = await sharp(poster)
    .resize(400, 400, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer()
  const preview = await sharp(poster)
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()
  const playback = await transcodeToMp4(original, ext)

  await storage().put({ key: keys.thumbnail, body: thumbnail, contentType: "image/webp" })
  await storage().put({ key: keys.preview, body: preview, contentType: "image/webp" })
  await storage().put({ key: keys.video, body: playback, contentType: "video/mp4" })

  await db
    .update(schema.assets)
    .set({
      status: "ready",
      width: probe.width,
      height: probe.height,
      durationMs: probe.duration ? Math.round(probe.duration * 1000) : null,
      thumbnailKey: keys.thumbnail,
      previewKey: keys.preview,
      updatedAt: new Date(),
    })
    .where(eq(schema.assets.id, asset.id))

  await readyEvent(asset)
}

const processAudio = async (asset: AssetRow): Promise<void> => {
  const original = await storage().get(asset.storageKey)
  const ext = extname(asset.originalFilename) || ".mp3"
  const probe = await probeVideo(original, ext).catch(() => ({
    width: null,
    height: null,
    duration: null,
  }))

  await db
    .update(schema.assets)
    .set({
      status: "ready",
      durationMs: probe.duration ? Math.round(probe.duration * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(schema.assets.id, asset.id))

  await readyEvent(asset)
}
