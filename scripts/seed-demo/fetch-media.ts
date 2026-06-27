/**
 * Download free, license-clear media into MEDIA_DIR for the seeder.
 *
 *   PROVIDER=pexels PEXELS_API_KEY=xxx TARGET_GB=25 pnpm --filter @workspace/seed-demo fetch
 *
 * Providers:
 *   pexels   — photos AND videos (free API key: https://www.pexels.com/api/). Default.
 *   unsplash — photos only (free key: https://unsplash.com/developers). NOTE: Unsplash has no video,
 *              no bursts, and its demo API is capped at 50 req/hr — fine for a few hundred photos, not
 *              for bulk. For 25 GB of Unsplash, use their Lite/Full dataset instead and point the
 *              seeder at the folder. The seeder synthesizes the timeline/bursts regardless of source.
 *
 * Files land flat in MEDIA_DIR; the seeder handles dates/bursts/GPS itself.
 */
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const PROVIDER = process.env.PROVIDER ?? "pexels"
const OUT_DIR = process.env.MEDIA_DIR ?? "./media"
const TARGET_BYTES = Number(process.env.TARGET_GB ?? 25) * 1024 ** 3
const VIDEO_RATIO = Number(process.env.VIDEO_RATIO ?? 0.18)

mkdirSync(OUT_DIR, { recursive: true })

const dirBytes = (): number => {
  let total = 0
  for (const name of existsSync(OUT_DIR) ? readdirSync(OUT_DIR) : []) {
    try {
      total += statSync(join(OUT_DIR, name)).size
    } catch {
      /* skip */
    }
  }
  return total
}

const fmtGb = (n: number) => `${(n / 1024 ** 3).toFixed(2)} GB`

const download = async (url: string, name: string, headers?: Record<string, string>) => {
  const dest = join(OUT_DIR, name)
  if (existsSync(dest)) return statSync(dest).size
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`download ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(dest, buf)
  return buf.length
}

const fetchPexels = async () => {
  const key = process.env.PEXELS_API_KEY
  if (!key) throw new Error("set PEXELS_API_KEY (https://www.pexels.com/api/)")
  const headers = { Authorization: key }
  let page = 1
  while (dirBytes() < TARGET_BYTES) {
    const wantVideo = Math.random() < VIDEO_RATIO
    const url = wantVideo
      ? `https://api.pexels.com/videos/popular?per_page=20&page=${page}`
      : `https://api.pexels.com/v1/curated?per_page=40&page=${page}`
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`pexels ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as {
      photos?: { id: number; src: { original: string } }[]
      videos?: { id: number; video_files: { quality: string; link: string; width?: number }[] }[]
    }
    const items = wantVideo ? (data.videos ?? []) : (data.photos ?? [])
    if (items.length === 0) {
      page = 1
      continue
    }
    for (const item of items) {
      if (dirBytes() >= TARGET_BYTES) break
      try {
        if (wantVideo) {
          const v = item as { id: number; video_files: { quality: string; link: string }[] }
          const file =
            v.video_files.find((f) => f.quality === "hd") ?? v.video_files[0]
          if (file) await download(file.link, `pexels-v-${v.id}.mp4`)
        } else {
          const p = item as { id: number; src: { original: string } }
          await download(p.src.original, `pexels-p-${p.id}.jpg`)
        }
      } catch (error) {
        console.warn(`  skip: ${(error as Error).message}`)
      }
    }
    console.log(`  page ${page} (${wantVideo ? "video" : "photo"}) → ${fmtGb(dirBytes())} / ${fmtGb(TARGET_BYTES)}`)
    page++
  }
}

/** A broad topic spread so 10k photos look like a real, varied library (not one subject). */
const UNSPLASH_TOPICS = [
  "nature", "landscape", "mountains", "ocean", "forest", "city", "architecture", "street",
  "travel", "food", "coffee", "animals", "dogs", "cats", "wildlife", "flowers", "people",
  "portrait", "wedding", "party", "beach", "sunset", "winter", "autumn", "desert", "sky",
  "cars", "interior", "technology", "sports", "music", "art", "night", "rain", "garden",
]

const fetchUnsplash = async () => {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) throw new Error("set UNSPLASH_ACCESS_KEY (https://unsplash.com/developers)")
  const width = Number(process.env.UNSPLASH_WIDTH ?? 4000) // high-res; ~2-5 MB each
  const seen = new Set<string>()
  let topicIdx = 0
  const page: Record<string, number> = {}

  while (dirBytes() < TARGET_BYTES) {
    const topic = UNSPLASH_TOPICS[topicIdx % UNSPLASH_TOPICS.length]!
    page[topic] = (page[topic] ?? 0) + 1
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(topic)}&per_page=30&page=${page[topic]}&content_filter=high&client_id=${key}`
    const res = await fetch(url)
    if (res.status === 403) {
      console.warn("  rate-limited by Unsplash (hourly cap) — stopping. Re-run later to continue.")
      break
    }
    if (!res.ok) throw new Error(`unsplash ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as {
      results?: { id: string; urls: { raw: string } }[]
    }
    const results = data.results ?? []
    if (results.length === 0) {
      topicIdx++ // exhausted this topic — move on
      if (topicIdx >= UNSPLASH_TOPICS.length * 50) break
      continue
    }
    for (const photo of results) {
      if (dirBytes() >= TARGET_BYTES) break
      if (seen.has(photo.id)) continue
      seen.add(photo.id)
      try {
        await download(`${photo.urls.raw}&w=${width}&q=80&fm=jpg`, `unsplash-${photo.id}.jpg`)
      } catch (error) {
        console.warn(`  skip: ${(error as Error).message}`)
      }
    }
    console.log(
      `  ${topic} p${page[topic]} · ${seen.size} photos · ${fmtGb(dirBytes())} / ${fmtGb(TARGET_BYTES)}`,
    )
    topicIdx++ // round-robin topics for variety
  }
}

const main = async () => {
  console.log(`Fetching ~${fmtGb(TARGET_BYTES)} via ${PROVIDER} into ${OUT_DIR} (have ${fmtGb(dirBytes())})`)
  if (PROVIDER === "pexels") await fetchPexels()
  else if (PROVIDER === "unsplash") await fetchUnsplash()
  else throw new Error(`unknown PROVIDER: ${PROVIDER}`)
  console.log(`Done — ${fmtGb(dirBytes())} in ${OUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
