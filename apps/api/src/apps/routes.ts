import { Hono } from "hono"
import { getSessionUser } from "../context"
import { getAppsForUser } from "./service"

type Variables = { userId: string }

export const appsRoutes = new Hono<{ Variables: Variables }>()

appsRoutes.use("*", async (c, next) => {
  const user = await getSessionUser(c.req.raw.headers)
  if (!user) return c.json({ error: "unauthorized" }, 401)
  c.set("userId", user.id)
  await next()
})

appsRoutes.get("/", async (c) => {
  return c.json({ apps: await getAppsForUser(c.get("userId")) })
})
