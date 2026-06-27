import { serve } from "@hono/node-server"
import { config } from "@workspace/config"
import { app, injectWebSocket } from "./app"
import { backfillDefaultRoles, seedSystemRoles } from "./admin/roles"

// Keep the built-in system roles in sync with their definitions on boot (so role changes ship with a
// deploy — e.g. the User role gaining Drive/Docs access), then backfill the default role onto any
// account that has none yet (self-heals users created before the role existed).
seedSystemRoles()
  .then(() => backfillDefaultRoles())
  .catch((error) => console.error("[api] role bootstrap failed:", error))

process.on("unhandledRejection", (reason) => {
  console.error("[api] unhandled rejection:", reason)
})

process.on("uncaughtException", (error) => {
  console.error("[api] uncaught exception:", error)
})

const server = serve({ fetch: app.fetch, port: config.api.port }, (info) => {
  console.log(`${config.appName} API listening on http://localhost:${info.port}`)
})

injectWebSocket(server)
