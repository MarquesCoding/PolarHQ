import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { Readable } from "node:stream"
import { fileURLToPath } from "node:url"
import { createNodeWebSocket } from "@hono/node-ws"
import { trpcServer } from "@hono/trpc-server"
import { auth } from "@workspace/auth"
import { config } from "@workspace/config"
import { publishDocSync, subscribeDocRoom, subscribeUserEvents } from "@workspace/jobs"
import { storage } from "@workspace/storage"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { accountRoutes } from "./account/routes"
import { adminRoutes } from "./admin/routes"
import { registerAdminModule } from "./admin/module"
import { appsRoutes } from "./apps/routes"
import { registerAppsModule } from "./apps/registry"
import { getSessionUser } from "./context"
import { registerDocsModule } from "./docs/module"
import { docsRoutes } from "./docs/routes"
import { canAccessDoc } from "./docs/service"
import { registerDriveModule } from "./drive/module"
import { driveRoutes } from "./drive/routes"
import { migrateRoutes } from "./migrate/routes"
import {
  getShareView,
  recordShareDownload,
  shareDownloadable,
} from "./drive/service"
import { renderShareNotFound, renderSharePage } from "./drive/sharePage"
import { getInstanceSettings } from "./instance"
import { registerPhotosModule } from "./photos/module"
import { photosRoutes } from "./photos/routes"
import { appRouter } from "./router"
import { setupRoutes } from "./setup/routes"

registerAdminModule()
registerAppsModule()
registerPhotosModule()
registerDriveModule()
registerDocsModule()

export const app = new Hono()

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app })
export { injectWebSocket }

app.use(
  "*",
  cors({
    origin: (origin, c) => {
      if (!origin) return config.web.url
      if (config.web.origins.includes(origin)) return origin
      const host = c.req.header("host")
      try {
        if (host && new URL(origin).host === host) return origin
      } catch {
        // ignore a malformed Origin header
      }
      return null
    },
    credentials: true,
    exposeHeaders: ["Content-Disposition"],
  }),
)

app.get("/health", (c) => c.json({ ok: true, app: config.appName }))

let sodiumJs: Buffer | null = null
app.get("/_sodium.js", (c) => {
  if (!sodiumJs)
    sodiumJs = readFileSync(fileURLToPath(new URL("../static/sodium.js", import.meta.url)))
  return new Response(sodiumJs, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
})

app.get("/s/:token", async (c) => {
  const token = c.req.param("token")
  const view = await getShareView(token)
  if (!view?.node.storageKey) return c.html(renderShareNotFound(), 404)

  const direct = c.req.query("direct") === "true"
  if (!direct) {
    return c.html(renderSharePage(view, `${config.api.url}/s/${token}?direct=true`))
  }

  if (!shareDownloadable(view.share)) {
    return c.text("This link has expired or reached its download limit.", 410)
  }
  await recordShareDownload(view.share.id)
  const { node } = view
  const stream = await storage().getStream(node.storageKey!)
  const ascii = node.name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "")
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": node.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(node.name)}`,
    },
  })
})

app.route("/api/v1/setup", setupRoutes)

app.post("/api/auth/sign-up/email", async (c, next) => {
  const settings = await getInstanceSettings()
  if (settings.setupCompleted && settings.registrationMode !== "open") {
    return c.json({ error: "setup.registrationDisabled" }, 403)
  }
  await next()
})

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))

app.route("/api/v1/account", accountRoutes)
app.route("/api/v1/admin", adminRoutes)
app.route("/api/v1/apps", appsRoutes)
app.route("/api/v1/photos", photosRoutes)
app.route("/api/v1/drive", driveRoutes)
app.route("/api/v1/docs", docsRoutes)
app.route("/api/v1/migrate", migrateRoutes)

app.get(
  "/ws",
  upgradeWebSocket((c) => {
    let unsubscribe: (() => Promise<void>) | undefined
    return {
      onOpen: async (_event, ws) => {
        const user = await getSessionUser(c.req.raw.headers)
        if (!user) {
          ws.close(1008, "unauthorized")
          return
        }
        unsubscribe = subscribeUserEvents(user.id, (event) => {
          ws.send(JSON.stringify(event))
        })
      },
      onClose: () => {
        void unsubscribe?.()
      },
    }
  }),
)

/**
 * Per-document collaboration relay. Clients exchange opaque Yjs sync/awareness
 * blobs; the server only fans them out to the room (sender excluded) over Redis —
 * no server-side Yjs. The `data` payload is never inspected, so Phase 3 can make
 * it ciphertext without touching this gateway.
 */
app.get(
  "/ws/doc",
  upgradeWebSocket((c) => {
    const nodeId = c.req.query("doc")
    const connId = randomUUID()
    let unsubscribe: (() => Promise<void>) | undefined
    return {
      onOpen: async (_event, ws) => {
        if (!nodeId) {
          ws.close(1008, "missing doc")
          return
        }
        const user = await getSessionUser(c.req.raw.headers)
        if (!user) {
          ws.close(1008, "unauthorized")
          return
        }
        if (!(await canAccessDoc(user.id, nodeId))) {
          ws.close(1008, "forbidden")
          return
        }
        unsubscribe = subscribeDocRoom(nodeId, (message) => {
          if (message.origin === connId) return
          ws.send(new Uint8Array(Buffer.from(message.data, "base64")))
        })
      },
      onMessage: (event) => {
        if (!nodeId) return
        const raw = event.data
        const buffer = typeof raw === "string" ? Buffer.from(raw) : Buffer.from(raw as ArrayBuffer)
        void publishDocSync(nodeId, { origin: connId, data: buffer.toString("base64") })
      },
      onClose: () => {
        void unsubscribe?.()
      },
    }
  }),
)

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/trpc",
    router: appRouter,
    createContext: async (_opts, c) => {
      const user = await getSessionUser(c.req.raw.headers)
      return { userId: user?.id ?? null }
    },
  }),
)
