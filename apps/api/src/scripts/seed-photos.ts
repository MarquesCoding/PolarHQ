import { createHash } from "node:crypto"
import { createId } from "@paralleldrive/cuid2"
import { db, schema } from "@workspace/db"
import { processAsset } from "@workspace/media/processor"
import { assetObjectKeys, storage } from "@workspace/storage"
import { eq } from "drizzle-orm"

const OWNER_ID = "Lp56fUcCBVMwKhhOJKrsOpXyc9L6Byic"
const TOTAL = 1000
const MAX_ATTEMPTS = 1500
const CONCURRENCY = 10

const DIMENSIONS: Array<[number, number]> = [
  [1600, 1067],
  [1080, 1350],
  [1200, 1200],
  [1600, 900],
  [1067, 1600],
  [1500, 1000],
  [900, 1600],
  [1400, 1050],
]

/** Assign each image to a day, where each day holds a random 5–20 images. */
const buildDayAssignments = (total: number): number[] => {
  const days: number[] = []
  let day = 0
  while (days.length < total) {
    const count = 5 + Math.floor(Math.random() * 16)
    for (let k = 0; k < count && days.length < total; k += 1) days.push(day)
    day += 1
  }
  return days
}

const dayAssignments = buildDayAssignments(MAX_ATTEMPTS)

const cleanup = async () => {
  const where = eq(schema.assets.ownerId, OWNER_ID)
  const rows = await db.select().from(schema.assets).where(where)
  const driver = storage()
  for (const asset of rows) {
    await driver.delete(asset.storageKey).catch(() => undefined)
    if (asset.thumbnailKey) await driver.delete(asset.thumbnailKey).catch(() => undefined)
    if (asset.previewKey) await driver.delete(asset.previewKey).catch(() => undefined)
  }
  await db.delete(schema.assets).where(where)
  console.log(`Removed ${rows.length} existing assets.`)
}

const fetchImage = async (index: number, width: number, height: number): Promise<Buffer> => {
  const url = `https://picsum.photos/seed/orbit${index}/${width}/${height}`
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return Buffer.from(await response.arrayBuffer())
    } catch {
      /* fall through to the backoff + retry below */
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)))
  }
  throw new Error(`fetch failed: ${url}`)
}

const seedOne = async (seed: number, slot: number): Promise<void> => {
  const [width, height] = DIMENSIONS[seed % DIMENSIONS.length]!
  const bytes = await fetchImage(seed, width, height)
  const checksum = createHash("sha256").update(bytes).digest("hex")
  const assetId = createId()
  const keys = assetObjectKeys(OWNER_ID, assetId, ".jpg")

  const daysAgo = dayAssignments[slot]!
  const takenAt = new Date(Date.now() - daysAgo * 86_400_000 - (slot % 12) * 1_800_000)

  await db.insert(schema.assets).values({
    id: assetId,
    ownerId: OWNER_ID,
    checksum,
    originalFilename: `seed-${String(slot + 1).padStart(4, "0")}.jpg`,
    mimeType: "image/jpeg",
    type: "image",
    sizeBytes: bytes.length,
    storageKey: keys.original,
    status: "processing",
    takenAt,
  })

  await storage().put({ key: keys.original, body: bytes, contentType: "image/jpeg" })
  await processAsset(assetId)
}

const main = async () => {
  await cleanup()

  let nextSeed = 0
  let success = 0
  let skipped = 0

  const runner = async () => {
    while (success < TOTAL) {
      const seed = nextSeed++
      if (seed >= MAX_ATTEMPTS) break
      try {
        await seedOne(seed, success)
        success += 1
        if (success % 50 === 0) console.log(`  ${success}/${TOTAL} seeded`)
      } catch {
        skipped += 1
      }
    }
  }

  console.log(`Seeding ${TOTAL} real photos for ${OWNER_ID}…`)
  await Promise.all(Array.from({ length: CONCURRENCY }, runner))
  console.log(`\nDone. ${success} seeded, ${skipped} skipped (duplicate/fetch).`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
