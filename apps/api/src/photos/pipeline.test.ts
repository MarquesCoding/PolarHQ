import { db, schema } from "@workspace/db"
import { processAsset } from "@workspace/media/processor"
import { storage } from "@workspace/storage"
import { eq } from "drizzle-orm"
import sharp from "sharp"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { serializeAsset } from "./serialize"
import { ingestUpload, listTimeline } from "./service"

const makeJpeg = (width: number, height: number): Promise<Buffer> =>
  sharp({
    create: { width, height, channels: 3, background: { r: 12, g: 120, b: 200 } },
  })
    .jpeg()
    .toBuffer()

describe("photos upload pipeline", () => {
  const userId = `test-user-${Date.now()}`
  let assetId: string

  beforeAll(async () => {
    await db
      .insert(schema.user)
      .values({
        id: userId,
        name: "Pipeline Test",
        email: `${userId}@example.com`,
        emailVerified: true,
      })
      .onConflictDoNothing()
  })

  afterAll(async () => {
    await db.delete(schema.user).where(eq(schema.user.id, userId))
  })

  it("ingests an upload and stores the original", async () => {
    const bytes = await makeJpeg(1200, 800)
    const result = await ingestUpload({
      ownerId: userId,
      filename: "beach.jpg",
      mimeType: "image/jpeg",
      bytes,
    })

    expect(result.deduped).toBe(false)
    expect(result.asset.status).toBe("processing")
    expect(result.asset.type).toBe("image")
    assetId = result.asset.id

    expect(await storage().exists(result.asset.storageKey)).toBe(true)
  })

  it("deduplicates a re-upload of identical bytes", async () => {
    const bytes = await makeJpeg(1200, 800)
    const result = await ingestUpload({
      ownerId: userId,
      filename: "beach-again.jpg",
      mimeType: "image/jpeg",
      bytes,
    })

    expect(result.deduped).toBe(true)
    expect(result.asset.id).toBe(assetId)
  })

  it("processes the asset into derivatives with dimensions", async () => {
    await processAsset(assetId)

    const rows = await db.select().from(schema.assets).where(eq(schema.assets.id, assetId)).limit(1)
    const processed = rows[0]
    expect(processed).toBeDefined()
    expect(processed?.status).toBe("ready")
    expect(processed?.width).toBe(1200)
    expect(processed?.height).toBe(800)
    expect(processed?.thumbnailKey).toBeTruthy()
    expect(processed?.previewKey).toBeTruthy()

    expect(await storage().exists(processed!.thumbnailKey!)).toBe(true)
    expect(await storage().exists(processed!.previewKey!)).toBe(true)
  })

  it("serves the thumbnail via a presigned URL", async () => {
    const rows = await db.select().from(schema.assets).where(eq(schema.assets.id, assetId)).limit(1)
    const dto = await serializeAsset(rows[0]!)
    expect(dto.thumbnailUrl).toBeTruthy()

    const response = await fetch(dto.thumbnailUrl!)
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("image/webp")
  })

  it("lists the processed asset on the timeline", async () => {
    const page = await listTimeline(userId)
    expect(page.assets.some((asset) => asset.id === assetId)).toBe(true)
  })
})
