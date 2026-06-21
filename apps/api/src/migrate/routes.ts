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
  listPickedMediaItems,
  saveGoogleAccount,
} from "./service"

const routes = new Hono()

// Short-lived OAuth `state` → userId map (CSRF + ties the callback to the user). In-memory is fine for
// a single instance; entries expire after 10 minutes.
const pendingStates = new Map<string, { userId: string; expires: number }>()
const STATE_TTL = 10 * 60 * 1000

const newState = (userId: string): string => {
  const state = crypto.randomUUID()
  pendingStates.set(state, { userId, expires: Date.now() + STATE_TTL })
  return state
}
const takeState = (state: string): string | null => {
  const entry = pendingStates.get(state)
  pendingStates.delete(state)
  return entry && entry.expires >= Date.now() ? entry.userId : null
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
  return c.json({ url: buildConsentUrl(newState(userId)) })
})

/** OAuth callback — exchanges the code, stores the refresh token, redirects back into the app. */
routes.get("/google/callback", async (c) => {
  const code = c.req.query("code")
  const state = c.req.query("state")
  const back = `${config.web.url}/account?google=`
  if (!code || !state) return c.redirect(`${back}error`)
  const userId = takeState(state)
  if (!userId) return c.redirect(`${back}error`)
  try {
    const { refreshToken, email } = await exchangeCode(code)
    await saveGoogleAccount(userId, refreshToken, email)
    return c.redirect(`${back}connected`)
  } catch {
    return c.redirect(`${back}error`)
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
