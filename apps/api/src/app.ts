import { Readable } from "node:stream"
import { createNodeWebSocket } from "@hono/node-ws"
import { trpcServer } from "@hono/trpc-server"
import { auth } from "@workspace/auth"
import { config } from "@workspace/config"
import { subscribeUserEvents } from "@workspace/jobs"
import { storage } from "@workspace/storage"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { adminRoutes } from "./admin/routes"
import { registerAdminModule } from "./admin/module"
import { appsRoutes } from "./apps/routes"
import { registerAppsModule } from "./apps/registry"
import { getSessionUser } from "./context"
import { registerDocsModule } from "./docs/module"
import { docsRoutes } from "./docs/routes"
import { registerDriveModule } from "./drive/module"
import { driveRoutes } from "./drive/routes"
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
    origin: config.web.url,
    credentials: true,
    exposeHeaders: ["Content-Disposition"],
  }),
)

app.get("/health", (c) => c.json({ ok: true, app: config.appName }))

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
    return c.json({ error: "registration is disabled on this instance" }, 403)
  }
  await next()
})

app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))

app.route("/api/v1/admin", adminRoutes)
app.route("/api/v1/apps", appsRoutes)
app.route("/api/v1/photos", photosRoutes)
app.route("/api/v1/drive", driveRoutes)
app.route("/api/v1/docs", docsRoutes)

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
