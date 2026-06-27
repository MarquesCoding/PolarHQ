/**
 * Headless E2E upload helpers — reuse PolarHQ's exact crypto (@workspace/core) so seeded media is
 * byte-for-byte compatible with what the app produces and decrypts. We deliberately avoid the
 * browser-only upload modules (canvas thumbnails, exifr, XHR) and instead generate thumbnails with
 * sharp / ffmpeg and post with Node's global fetch + FormData.
 */
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, extname, join } from "node:path"

import { configureApiAuth } from "@workspace/core/apiClient"
import { configureCore, coreConfig } from "@workspace/core/config"
import { cryptoReady, secretboxSeal } from "@workspace/core/crypto"
import {
  createContentKey,
  encryptName,
  encryptWithMetaKey,
  encryptedPlaceholder,
  isEnrolled,
  setupKeys,
  storeContentKey,
  unlockKeys,
} from "@workspace/core/e2e"
import { configureSecureStore } from "@workspace/core/secureStore"
import sharp from "sharp"

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".m4v": "video/mp4",
}

export const SUPPORTED_EXTS = Object.keys(MIME_BY_EXT)

export const mimeFor = (path: string): string =>
  MIME_BY_EXT[extname(path).toLowerCase()] ?? "application/octet-stream"

export const isVideoPath = (path: string): boolean => mimeFor(path).startsWith("video/")

// libsodium returns Uint8Array<ArrayBufferLike>; fetch/File typings want an ArrayBuffer-backed view.
const asPart = (u: Uint8Array): BlobPart => u as unknown as BlobPart
const asBody = (u: Uint8Array): BodyInit => u as unknown as BodyInit

let token = ""

/** Point core at the server and install a no-op keypair cache (Node has no IndexedDB). */
export const connect = (apiUrl: string): void => {
  configureSecureStore({
    get: async () => null,
    set: async () => undefined,
    clear: async () => undefined,
  })
  configureCore({ appName: "PolarHQ", apiUrl, appVersion: "seed", appBuild: "seed" })
  configureApiAuth(() => (token ? { Authorization: `Bearer ${token}` } : undefined))
}

/** Sign in with email/password and capture the bearer token (better-auth `bearer` plugin). */
export const signIn = async (email: string, password: string): Promise<void> => {
  const res = await fetch(`${coreConfig().apiUrl}/api/auth/sign-in/email`, {
    method: "POST",
    // better-auth rejects auth requests with no trusted Origin; the demo serves API + web on one origin.
    headers: { "content-type": "application/json", origin: coreConfig().apiUrl },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`sign-in failed (${res.status}): ${await res.text()}`)
  const headerToken = res.headers.get("set-auth-token")
  const body = (await res.json().catch(() => ({}))) as { token?: string }
  token = headerToken ?? body.token ?? ""
  if (!token) throw new Error("sign-in returned no bearer token")
}

/** Ensure the account has E2E keys and they're unlocked in memory (set up on first run). */
export const ensureKeys = async (password: string): Promise<void> => {
  await cryptoReady()
  if (await isEnrolled()) {
    if (!(await unlockKeys(password))) throw new Error("wrong password — could not unlock E2E keys")
  } else {
    const { recoveryCode } = await setupKeys(password)
    console.log(`  set up E2E keys for this account. RECOVERY CODE (save it): ${recoveryCode}`)
  }
}

const authed = (path: string, init: RequestInit): Promise<Response> =>
  fetch(`${coreConfig().apiUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  })

interface Analyzed {
  thumbnail: Buffer | null
  width?: number
  height?: number
  durationMs?: number
}

const run = (cmd: string, args: string[]): string | null => {
  const out = spawnSync(cmd, args, { encoding: "utf8" })
  return out.status === 0 ? out.stdout : null
}

/** Image: dimensions + a 512px JPEG thumbnail via sharp. */
const analyzeImage = async (bytes: Buffer): Promise<Analyzed> => {
  const image = sharp(bytes, { failOn: "none" }).rotate()
  const meta = await image.metadata()
  const thumbnail = await image
    .resize({ width: 512, withoutEnlargement: true })
    .jpeg({ quality: 72 })
    .toBuffer()
  return { thumbnail, width: meta.width, height: meta.height }
}

/** Video: probe dimensions/duration with ffprobe and grab a poster frame with ffmpeg (best-effort). */
const analyzeVideo = async (path: string): Promise<Analyzed> => {
  const probe = run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:format=duration",
    "-of",
    "json",
    path,
  ])
  let width: number | undefined
  let height: number | undefined
  let durationMs: number | undefined
  if (probe) {
    try {
      const data = JSON.parse(probe) as {
        streams?: { width?: number; height?: number }[]
        format?: { duration?: string }
      }
      width = data.streams?.[0]?.width
      height = data.streams?.[0]?.height
      const dur = Number(data.format?.duration)
      if (Number.isFinite(dur)) durationMs = Math.round(dur * 1000)
    } catch {
      /* ignore */
    }
  }
  let thumbnail: Buffer | null = null
  const dir = mkdtempSync(join(tmpdir(), "seed-poster-"))
  try {
    const frame = join(dir, "frame.jpg")
    const ok = run("ffmpeg", ["-ss", "1", "-i", path, "-frames:v", "1", "-y", frame])
    if (ok !== null) {
      thumbnail = await sharp(readFileSync(frame))
        .resize({ width: 512, withoutEnlargement: true })
        .jpeg({ quality: 72 })
        .toBuffer()
    }
  } catch {
    /* no poster — asset still uploads */
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  return { thumbnail, width, height, durationMs }
}

export interface UploadInput {
  path: string
  /** Capture time in ms — drives the timeline + burst grouping. */
  takenAtMs: number
  /** Optional GPS so the map populates. */
  gps?: { lat: number; lng: number }
}

/** Encrypt one media file end-to-end and upload it to the photos API as the signed-in user. */
export const uploadOne = async (input: UploadInput): Promise<string> => {
  const original = readFileSync(input.path)
  const mimeType = mimeFor(input.path)
  const analyzed = isVideoPath(input.path)
    ? await analyzeVideo(input.path)
    : await analyzeImage(original)

  const key = createContentKey()
  const encName = encryptName(basename(input.path))
  const placeholder = encName ? encryptedPlaceholder() : basename(input.path)
  const sealed = secretboxSeal(new Uint8Array(original), key)

  const form = new FormData()
  form.set("file", new File([asPart(sealed)], placeholder, { type: "application/octet-stream" }))
  form.set("encrypted", "true")
  form.set("mimeType", mimeType)
  if (analyzed.width) form.set("width", String(analyzed.width))
  if (analyzed.height) form.set("height", String(analyzed.height))
  if (analyzed.durationMs) form.set("durationMs", String(analyzed.durationMs))
  if (encName) form.set("encryptedName", encName)
  form.set("mtime", String(input.takenAtMs))
  if (input.gps) {
    const loc = encryptWithMetaKey(
      new TextEncoder().encode(JSON.stringify({ lat: input.gps.lat, lng: input.gps.lng })),
    )
    if (loc) form.set("encryptedLocation", loc)
  }

  const res = await authed("/api/v1/photos/assets", { method: "POST", body: form })
  if (!res.ok) throw new Error(`upload failed (${res.status}): ${await res.text()}`)
  const { asset, mirrorNodeId } = (await res.json()) as {
    asset: { id: string }
    mirrorNodeId: string | null
  }

  await storeContentKey(asset.id, key)
  if (mirrorNodeId) await storeContentKey(mirrorNodeId, key)

  if (analyzed.thumbnail) {
    const encThumb = secretboxSeal(new Uint8Array(analyzed.thumbnail), key)
    await authed(`/api/v1/photos/assets/${asset.id}/thumbnail`, {
      method: "PUT",
      headers: { "content-type": "application/octet-stream" },
      body: asBody(encThumb),
    })
    if (mirrorNodeId) {
      await authed(`/api/v1/drive/nodes/${mirrorNodeId}/thumbnail`, {
        method: "PUT",
        headers: { "content-type": "application/octet-stream" },
        body: asBody(encThumb),
      }).catch(() => undefined)
    }
  }
  return asset.id
}
