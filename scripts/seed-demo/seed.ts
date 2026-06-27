/**
 * Bulk-seed a PolarHQ account with E2E-encrypted demo media.
 *
 *   API_URL=https://demo.polarhq.app EMAIL=demo@... PASSWORD=... \
 *     pnpm --filter @workspace/seed-demo seed
 *
 * Reads every supported file under MEDIA_DIR (default ./media), assigns each a synthetic capture
 * time so the timeline looks real — with some clustered into bursts and some given GPS so the map
 * populates — then encrypts and uploads them as the signed-in user. Run this with demo mode OFF
 * (uploads by a non-admin are blocked when it's on); turn demo mode on afterwards to freeze it.
 *
 * Idempotent: a `.seeded.json` ledger records uploaded files so re-runs skip them (resume a 25 GB
 * run after an interruption). DRY_RUN=1 prints the plan and tests thumbnailing without uploading.
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { SUPPORTED_EXTS, connect, ensureKeys, isVideoPath, signIn, uploadOne } from "./lib"

const API_URL = process.env.API_URL ?? "http://localhost:3001"
const EMAIL = process.env.EMAIL ?? ""
const PASSWORD = process.env.PASSWORD ?? ""
const MEDIA_DIR = process.env.MEDIA_DIR ?? "./media"
const MONTHS = Number(process.env.MONTHS ?? 24)
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 4)
const DRY_RUN = process.env.DRY_RUN === "1"
const NOW = Number(process.env.NOW_MS ?? Date.now())

/** A few real city centers so GPS clusters read as "trips" on the map. */
const PLACES = [
  { name: "London", lat: 51.5074, lng: -0.1278 },
  { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
  { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
  { name: "New York", lat: 40.7128, lng: -74.006 },
  { name: "Reykjavik", lat: 64.1466, lng: -21.9426 },
]

// Deterministic PRNG (seeded) so re-runs plan identically — important for the resume ledger.
let seed = 0x9e3779b9
const rand = (): number => {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 0xffffffff
}
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!
const jitter = (around: number, lat: number, lng: number) => ({
  lat: lat + (rand() - 0.5) * around,
  lng: lng + (rand() - 0.5) * around,
})

const walk = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (SUPPORTED_EXTS.includes(`.${entry.name.split(".").pop()?.toLowerCase()}`)) out.push(full)
  }
  return out
}

interface Planned {
  path: string
  takenAtMs: number
  gps?: { lat: number; lng: number }
}

/** Spread files across MONTHS, clustering ~1-in-6 into bursts and ~40% into GPS "trips". */
const plan = (files: string[]): Planned[] => {
  const spanMs = MONTHS * 30 * 24 * 60 * 60 * 1000
  const start = NOW - spanMs
  const step = files.length > 1 ? spanMs / files.length : 0
  const result: Planned[] = []
  let i = 0
  let place: { lat: number; lng: number; name: string } | null = null
  let placeLeft = 0
  while (i < files.length) {
    // Occasionally start/stop a GPS "trip" (a run of consecutive photos in one place).
    if (placeLeft <= 0) {
      place = rand() < 0.4 ? pick(PLACES) : null
      placeLeft = 5 + Math.floor(rand() * 25)
    }
    const base = start + step * i + rand() * step
    // ~1-in-6 anchor frames become a 3-7 shot burst, all within ~6 seconds.
    const burst = rand() < 0.16 ? 3 + Math.floor(rand() * 5) : 1
    for (let b = 0; b < burst && i < files.length; b++, i++) {
      result.push({
        path: files[i]!,
        takenAtMs: Math.round(base + b * (600 + rand() * 900)),
        gps: place ? jitter(0.08, place.lat, place.lng) : undefined,
      })
      placeLeft--
    }
  }
  return result
}

const ledgerPath = join(MEDIA_DIR, ".seeded.json")
const loadLedger = (): Record<string, string> =>
  existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, "utf8")) : {}

const fmtBytes = (n: number): string => {
  const u = ["B", "KB", "MB", "GB", "TB"]
  const e = n > 0 ? Math.min(Math.floor(Math.log(n) / Math.log(1024)), 4) : 0
  return `${(n / 1024 ** e).toFixed(e ? 1 : 0)} ${u[e]}`
}

const main = async () => {
  if (!existsSync(MEDIA_DIR)) throw new Error(`MEDIA_DIR not found: ${MEDIA_DIR}`)
  const files = walk(MEDIA_DIR)
  if (files.length === 0) throw new Error(`no supported media under ${MEDIA_DIR}`)
  const totalBytes = files.reduce((sum, f) => sum + statSync(f).size, 0)
  const planned = plan(files)
  const bursts = planned.filter((p, idx) => idx > 0 && p.takenAtMs - planned[idx - 1]!.takenAtMs < 3000)
  const withGps = planned.filter((p) => p.gps).length

  console.log(`Media:   ${files.length} files (${fmtBytes(totalBytes)}) under ${MEDIA_DIR}`)
  console.log(`Videos:  ${files.filter(isVideoPath).length}`)
  console.log(`Timeline:${MONTHS} months · ~${bursts.length} burst frames · ${withGps} with GPS`)

  if (DRY_RUN) {
    console.log("\nDRY_RUN — testing thumbnail generation on the first file…")
    const { mimeFor } = await import("./lib")
    console.log(`  first: ${planned[0]!.path} (${mimeFor(planned[0]!.path)})`)
    console.log("  (no auth, no upload). Drop DRY_RUN to seed for real.")
    return
  }

  if (!EMAIL || !PASSWORD) throw new Error("set EMAIL and PASSWORD env vars")
  console.log(`\nConnecting to ${API_URL} as ${EMAIL}…`)
  connect(API_URL)
  await signIn(EMAIL, PASSWORD)
  await ensureKeys(PASSWORD)
  console.log("Authenticated + E2E unlocked.\n")

  const ledger = loadLedger()
  const todo = planned.filter((p) => !ledger[p.path])
  console.log(`${todo.length} to upload (${planned.length - todo.length} already seeded).`)

  let done = 0
  let failed = 0
  const queue = [...todo]
  const persist = () => writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2))

  const worker = async () => {
    for (;;) {
      const item = queue.shift()
      if (!item) return
      try {
        const id = await uploadOne(item)
        ledger[item.path] = id
        done++
        if (done % 10 === 0 || done === todo.length) {
          persist()
          console.log(`  ${done}/${todo.length} uploaded…`)
        }
      } catch (error) {
        failed++
        console.warn(`  ✗ ${item.path}: ${(error as Error).message}`)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker))
  persist()
  console.log(`\nDone. ${done} uploaded, ${failed} failed. Ledger: ${ledgerPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
