import { serve } from "@hono/node-server"
import { config } from "@polarhq/config"
import { app, injectWebSocket } from "./app"

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
