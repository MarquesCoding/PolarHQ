import { publishUserEvent } from "@workspace/jobs"
import { Hono } from "hono"
import { z } from "zod"
import { getSessionUser } from "../context"
import { type DeviceRow, listDevices, registerDevice, removeDevice, touchDevice } from "./service"

type Variables = { userId: string }

export const deviceRoutes = new Hono<{ Variables: Variables }>()

deviceRoutes.use("*", async (c, next) => {
  const user = await getSessionUser(c.req.raw.headers)
  if (!user) return c.json({ error: "unauthorized" }, 401)
  c.set("userId", user.id)
  await next()
})

/** Broadcast a device-list change to the user's other clients so their Drive sidebar refreshes. */
const notify = (userId: string) =>
  publishUserEvent(userId, { type: "device.changed", scope: `user:${userId}`, payload: {} })

const serialize = (row: DeviceRow) => ({
  id: row.id,
  deviceId: row.deviceId,
  name: row.name,
  platform: row.platform,
  kind: row.kind,
  lastSeenAt: row.lastSeenAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
})

const registerSchema = z.object({
  deviceId: z.string().min(1).max(128),
  name: z.string().min(1).max(120),
  platform: z.enum(["macos", "windows", "linux", "web", "ios", "android"]),
  kind: z.enum(["desktop", "web", "mobile"]),
})

deviceRoutes.get("/", async (c) => {
  const devices = await listDevices(c.get("userId"))
  return c.json({ devices: devices.map(serialize) })
})

deviceRoutes.post("/register", async (c) => {
  const body = await c.req.json().catch(() => null)
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  const device = await registerDevice(c.get("userId"), parsed.data)
  void notify(c.get("userId"))
  return c.json({ device: serialize(device) }, 201)
})

deviceRoutes.post("/heartbeat", async (c) => {
  const body = await c.req.json().catch(() => null)
  const deviceId = typeof body?.deviceId === "string" ? body.deviceId : null
  if (!deviceId) return c.json({ error: "invalidInput" }, 400)
  await touchDevice(c.get("userId"), deviceId)
  void notify(c.get("userId"))
  return c.json({ ok: true })
})

deviceRoutes.delete("/:id", async (c) => {
  await removeDevice(c.get("userId"), c.req.param("id"))
  void notify(c.get("userId"))
  return c.json({ ok: true })
})
