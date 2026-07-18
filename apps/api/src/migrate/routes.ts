import { config } from "@workspace/config"
import { type Context, Hono } from "hono"
import { getSessionUser } from "../context"
import { buildConsentUrl, exchangeCode } from "./google"
import {
  createPickerSession,
  deletePickerSession,
  disconnectGoogle,
  fetchGoogleDocExport,
  fetchGoogleDriveBytes,
  fetchGooglePhotoBytes,
  getGoogleAccount,
  getPickerSession,
  googleAccessToken,
  listGoogleDriveFiles,
  listImported,
  listPickedMediaItems,
  recordImported,
  saveGoogleAccount,
} from "./service"

const routes = new Hono()

const pendingStates = new Map<string, { userId: string; desktop: boolean; expires: number }>()
const STATE_TTL = 10 * 60 * 1000

const newState = (userId: string, desktop: boolean): string => {
  const state = crypto.randomUUID()
  pendingStates.set(state, { userId, desktop, expires: Date.now() + STATE_TTL })
  return state
}
const takeState = (state: string): { userId: string; desktop: boolean } | null => {
  const entry = pendingStates.get(state)
  pendingStates.delete(state)
  if (!entry || entry.expires < Date.now()) return null
  return { userId: entry.userId, desktop: entry.desktop }
}

/** Minimal self-contained page shown to the desktop user after the browser-based OAuth round-trip. */
const desktopResultPage = (ok: boolean): string => {
  const title = ok ? "Google connected" : "Connection failed"
  const body = ok
    ? "Your Google account is linked. You can close this tab and return to PolarHQ."
    : "Something went wrong linking your Google account. Close this tab and try again in PolarHQ."
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,-apple-system,sans-serif;background:#0b0b0f;color:#e7e7ea;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}main{max-width:28rem;padding:2rem;text-align:center}h1{font-size:1.1rem;margin:0 0 .5rem}p{color:#a1a1aa;margin:0;line-height:1.5}</style></head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`
}

/** Resolve the session user, or send 401. Returns null if unauthorized (caller should return early). */
const requireUser = async (c: Context): Promise<string | null> => {
  const user = await getSessionUser(c.req.raw.headers)
  return user?.id ?? null
}

/** Start the Google OAuth flow — returns the consent URL for the client to open. */
routes.get("/google/connect", async (c) => {
  const userId = await requireUser(c)
  if (!userId) return c.json({ error: "unauthorized" }, 401)
  if (!config.google.clientId) return c.json({ error: "migrate.google.notConfigured" }, 503)
  const desktop = c.req.query("client") === "desktop"
  return c.json({ url: buildConsentUrl(newState(userId, desktop)) })
})

/**
 * OAuth callback — exchanges the code and stores the refresh token. Web flows redirect back into the
 * app; desktop flows (which run in the system browser and poll status) get a static "return to the
 * app" page so they don't depend on the web app being reachable.
 */
routes.get("/google/callback", async (c) => {
  const code = c.req.query("code")
  const state = c.req.query("state")
  const entry = state ? takeState(state) : null
  const desktop = entry?.desktop ?? false
  const back = `${config.web.url}/account?google=`
  const fail = () =>
    desktop ? c.html(desktopResultPage(false), 400) : c.redirect(`${back}error`)
  if (!code || !entry) return fail()
  try {
    const { refreshToken, email } = await exchangeCode(code)
    await saveGoogleAccount(entry.userId, refreshToken, email)
    return desktop ? c.html(desktopResultPage(true)) : c.redirect(`${back}connected`)
  } catch {
    return fail()
  }
})

/** Whether the user has linked a Google account (and whether the server is configured for it). */
routes.get("/google/status", async (c) => {
  const userId = await requireUser(c)
  if (!userId) return c.json({ error: "unauthorized" }, 401)
  const account = await getGoogleAccount(userId)
  return c.json({
    connected: Boolean(account),
    email: account?.email ?? null,
    configured: Boolean(config.google.clientId),
  })
})

/** Unlink the Google account. */
routes.delete("/google", async (c) => {
  const userId = await requireUser(c)
  if (!userId) return c.json({ error: "unauthorized" }, 401)
  await disconnectGoogle(userId)
  return c.json({ ok: true })
})

/** Create a Photos Picker session — the client opens `pickerUri` so the user can choose what to import. */
routes.post("/google/picker/session", async (c) => {
  const userId = await requireUser(c)
  if (!userId) return c.json({ error: "unauthorized" }, 401)
  const token = await googleAccessToken(userId)
  if (!token) return c.json({ error: "migrate.google.notConnected" }, 409)
  return c.json(await createPickerSession(token))
})

/** Poll a Picker session — `mediaItemsSet` flips true once the user finishes selecting. */
routes.get("/google/picker/session/:id", async (c) => {
  const userId = await requireUser(c)
  if (!userId) return c.json({ error: "unauthorized" }, 401)
  const token = await googleAccessToken(userId)
  if (!token) return c.json({ error: "migrate.google.notConnected" }, 409)
  return c.json(await getPickerSession(token, c.req.param("id")))
})

/** Discard a Picker session once the import is done or abandoned. */
routes.delete("/google/picker/session/:id", async (c) => {
  const userId = await requireUser(c)
  if (!userId) return c.json({ error: "unauthorized" }, 401)
  const token = await googleAccessToken(userId)
  if (!token) return c.json({ error: "migrate.google.notConnected" }, 409)
  await deletePickerSession(token, c.req.param("id"))
  return c.json({ ok: true })
})

/** A page of the media the user picked in a Picker session. */
routes.get("/google/picker/items", async (c) => {
  const userId = await requireUser(c)
  if (!userId) return c.json({ error: "unauthorized" }, 401)
  const token = await googleAccessToken(userId)
  if (!token) return c.json({ error: "migrate.google.notConnected" }, 409)
  const sessionId = c.req.query("sessionId")
  if (!sessionId) return c.json({ error: "invalidInput" }, 400)
  return c.json(await listPickedMediaItems(token, sessionId, c.req.query("pageToken")))
})

/** The ledger of already-imported items for a source, so the client can skip them (resumability). */
routes.get("/imported", async (c) => {
  const userId = await requireUser(c)
  if (!userId) return c.json({ error: "unauthorized" }, 401)
  const source = c.req.query("source")
  if (source !== "photos" && source !== "drive") return c.json({ error: "invalidInput" }, 400)
  return c.json({ items: await listImported(userId, source) })
})

/** Record an item as imported (idempotent). `polarId` carries a created folder's node id. */
routes.post("/imported", async (c) => {
  const userId = await requireUser(c)
  if (!userId) return c.json({ error: "unauthorized" }, 401)
  const body = await c.req.json<{ source?: string; googleId?: string; polarId?: string | null }>()
  if ((body.source !== "photos" && body.source !== "drive") || !body.googleId)
    return c.json({ error: "invalidInput" }, 400)
  await recordImported(userId, body.source, body.googleId, body.polarId ?? null)
  return c.json({ ok: true })
})

/** A page of the user's Google Drive files. */
routes.get("/google/drive", async (c) => {
  const userId = await requireUser(c)
  if (!userId) return c.json({ error: "unauthorized" }, 401)
  const token = await googleAccessToken(userId)
  if (!token) return c.json({ error: "migrate.google.notConnected" }, 409)
  return c.json(await listGoogleDriveFiles(token, c.req.query("pageToken")))
})

/**
 * Download proxy — streams the original bytes from Google so the **client** can encrypt + upload them.
 * The bytes only pass through the server transiently; nothing is persisted in plaintext, so the
 * imported content stays end-to-end encrypted.
 */
routes.get("/google/download", async (c) => {
  const userId = await requireUser(c)
  if (!userId) return c.json({ error: "unauthorized" }, 401)
  const token = await googleAccessToken(userId)
  if (!token) return c.json({ error: "migrate.google.notConnected" }, 409)

  const source = c.req.query("source")
  let upstream: Response
  if (source === "photos") {
    const baseUrl = c.req.query("baseUrl")
    if (!baseUrl) return c.json({ error: "invalidInput" }, 400)
    upstream = await fetchGooglePhotoBytes(token, baseUrl, c.req.query("video") === "1")
  } else if (source === "drive") {
    const fileId = c.req.query("fileId")
    if (!fileId) return c.json({ error: "invalidInput" }, 400)
    upstream = await fetchGoogleDriveBytes(token, fileId)
  } else if (source === "drive-export") {
    const fileId = c.req.query("fileId")
    const exportMime = c.req.query("exportMime")
    if (!fileId || !exportMime) return c.json({ error: "invalidInput" }, 400)
    upstream = await fetchGoogleDocExport(token, fileId, exportMime)
  } else {
    return c.json({ error: "invalidInput" }, 400)
  }

  if (!upstream.ok || !upstream.body) return c.json({ error: "migrate.google.downloadFailed" }, 502)
  const headers: Record<string, string> = {
    "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
  }
  const length = upstream.headers.get("content-length")
  if (length) headers["content-length"] = length
  return new Response(upstream.body, { headers })
})

export { routes as migrateRoutes }
