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

/** Broad topic spread so the library looks varied (not one subject), shared by Pexels + Unsplash. */
const TOPICS = [
  "nature", "landscape", "mountains", "ocean", "forest", "city", "architecture", "street",
  "travel", "food", "coffee", "animals", "dogs", "cats", "wildlife", "flowers", "people",
  "portrait", "wedding", "party", "beach", "sunset", "winter", "autumn", "desert", "sky",
  "cars", "interior", "technology", "sports", "music", "art", "night", "rain", "garden",
  "hiking", "waterfall", "snow", "boat", "bridge", "market", "concert", "fashion", "kids",
]

const fetchPexels = async () => {
  const key = process.env.PEXELS_API_KEY
  if (!key) throw new Error("set PEXELS_API_KEY (https://www.pexels.com/api/)")
  const headers = { Authorization: key }
  const seen = new Set<string>()
  let topicIdx = 0
  const page: Record<string, number> = {}
  let sinceVideo = 0

  while (dirBytes() < TARGET_BYTES) {
    const topic = TOPICS[topicIdx % TOPICS.length]!
    // Interleave a video search roughly every 1/VIDEO_RATIO topics.
    const wantVideo = VIDEO_RATIO > 0 && ++sinceVideo >= Math.round(1 / VIDEO_RATIO)
    if (wantVideo) sinceVideo = 0
    const kind = wantVideo ? "v" : "p"
    page[`${kind}:${topic}`] = (page[`${kind}:${topic}`] ?? 0) + 1
    const pg = page[`${kind}:${topic}`]!
    const url = wantVideo
      ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(topic)}&per_page=80&page=${pg}`
      : `https://api.pexels.com/v1/search?query=${encodeURIComponent(topic)}&per_page=80&page=${pg}`

    const res = await fetch(url, { headers })
    if (res.status === 429) {
      console.warn("  429 rate-limited — sleeping 60s…")
      await sleep(60000)
      continue
    }
    if (!res.ok) throw new Error(`pexels ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as {
      photos?: { id: number; src: { original: string } }[]
      videos?: { id: number; video_files: { quality: string; link: string }[] }[]
    }
    const items = wantVideo ? (data.videos ?? []) : (data.photos ?? [])
    if (items.length === 0) {
      topicIdx++ // exhausted this topic/kind
      continue
    }
    for (const item of items) {
      if (dirBytes() >= TARGET_BYTES) break
      const id = `${kind}-${item.id}`
      if (seen.has(id)) continue
      seen.add(id)
      try {
        if (wantVideo) {
          const v = item as { id: number; video_files: { quality: string; link: string }[] }
          const file = v.video_files.find((f) => f.quality === "hd") ?? v.video_files[0]
          if (file) await download(file.link, `pexels-v-${v.id}.mp4`)
        } else {
          const p = item as { id: number; src: { original: string } }
          await download(p.src.original, `pexels-p-${p.id}.jpg`)
        }
      } catch (error) {
        console.warn(`  skip ${id}: ${(error as Error).message}`)
      }
    }
    console.log(`  ${topic} ${kind}${pg} · ${seen.size} items · ${fmtGb(dirBytes())} / ${fmtGb(TARGET_BYTES)}`)
    topicIdx++
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

/**
 * Wikimedia Commons "Quality images" — ~400k professionally vetted, freely-licensed photos. No API
 * key; the only requirement is a descriptive User-Agent. We page the category and download a high-res
 * scaled rendition (keeps sizes ~1-4 MB instead of pulling 50 MB originals).
 */
const fetchWikimedia = async () => {
  const width = Number(process.env.WIDTH ?? 3840)
  const category = process.env.WM_CATEGORY ?? "Category:Quality_images"
  const ua = "PolarHQ-demo-seed/1.0 (https://polarhq.app; admin@polarhq.app)"
  let cont: string | undefined
  let count = 0
  while (dirBytes() < TARGET_BYTES) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "categorymembers",
      gcmtitle: category,
      gcmtype: "file",
      gcmlimit: "100",
      prop: "imageinfo",
      iiprop: "url|size|mime",
      iiurlwidth: String(width),
    })
    if (cont) params.set("gcmcontinue", cont)
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      headers: { "user-agent": ua },
    })
    if (!res.ok) throw new Error(`wikimedia ${res.status}: ${await res.text()}`)
    const data = (await res.json()) as {
      continue?: { gcmcontinue?: string }
      query?: {
        pages?: Record<
          string,
          { title: string; imageinfo?: { thumburl?: string; url?: string; mime?: string }[] }
        >
      }
    }
    const pages = Object.values(data.query?.pages ?? {})
    for (const page of pages) {
      if (dirBytes() >= TARGET_BYTES) break
      const info = page.imageinfo?.[0]
      if (!info || !/image\/(jpeg|png|webp)/.test(info.mime ?? "")) continue
      const src = info.thumburl ?? info.url
      if (!src) continue
      const safe = page.title.replace(/^File:/, "").replace(/[^a-zA-Z0-9.-]/g, "_").slice(-80)
      try {
        await download(src, `wm-${count}-${safe}.jpg`, { "user-agent": ua })
        count++
      } catch (error) {
        console.warn(`  skip: ${(error as Error).message}`)
      }
    }
    console.log(`  ${count} photos · ${fmtGb(dirBytes())} / ${fmtGb(TARGET_BYTES)}`)
    cont = data.continue?.gcmcontinue
    if (!cont) {
      console.log("  reached end of category.")
      break
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const main = async () => {
  console.log(`Fetching ~${fmtGb(TARGET_BYTES)} via ${PROVIDER} into ${OUT_DIR} (have ${fmtGb(dirBytes())})`)
  if (PROVIDER === "pexels") await fetchPexels()
  else if (PROVIDER === "unsplash") await fetchUnsplash()
  else if (PROVIDER === "wikimedia") await fetchWikimedia()
  else throw new Error(`unknown PROVIDER: ${PROVIDER}`)
  console.log(`Done — ${fmtGb(dirBytes())} in ${OUT_DIR}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
