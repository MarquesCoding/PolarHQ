import { auth } from "@workspace/auth"
import { Hono } from "hono"
import { getSessionUser } from "../context"

type Variables = { userId: string }

export const accountRoutes = new Hono<{ Variables: Variables }>()

accountRoutes.use("*", async (c, next) => {
  const user = await getSessionUser(c.req.raw.headers)
  if (!user) return c.json({ error: "unauthorized" }, 401)
  c.set("userId", user.id)
  await next()
})

interface ParsedAgent {
  label: string
  platform: "ios" | "android" | "mac" | "windows" | "linux" | "web"
}

/** Best-effort, human-friendly device label from a User-Agent string. */
const parseAgent = (ua: string | null | undefined): ParsedAgent => {
  const agent = ua ?? ""
  if (/Orbit-iOS/i.test(agent)) return { label: "Orbit for iOS", platform: "ios" }
  if (/Orbit-Android/i.test(agent)) return { label: "Orbit for Android", platform: "android" }

  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /OPR\//.test(agent)
      ? "Opera"
      : /Firefox\//.test(agent)
        ? "Firefox"
        : /Chrome\//.test(agent)
          ? "Chrome"
          : /Safari\//.test(agent)
            ? "Safari"
            : null

  let platform: ParsedAgent["platform"] = "web"
  let os = "Unknown device"
  if (/iPhone|iPad|iPod/.test(agent)) {
    platform = "ios"
    os = "iOS"
  } else if (/Android/.test(agent)) {
    platform = "android"
    os = "Android"
  } else if (/Macintosh|Mac OS X/.test(agent)) {
    platform = "mac"
    os = "macOS"
  } else if (/Windows/.test(agent)) {
    platform = "windows"
    os = "Windows"
  } else if (/Linux/.test(agent)) {
    platform = "linux"
    os = "Linux"
  }

  return { label: browser ? `${browser} on ${os}` : os, platform }
}

accountRoutes.get("/devices", async (c) => {
  const headers = c.req.raw.headers
  const [sessions, current] = await Promise.all([
    auth.api.listSessions({ headers }),
    auth.api.getSession({ headers }),
  ])
  const currentToken = current?.session.token

  const devices = sessions
    .map((session) => {
      const parsed = parseAgent(session.userAgent)
      return {
        id: session.id,
        label: parsed.label,
        platform: parsed.platform,
        ipAddress: session.ipAddress || null,
        createdAt: session.createdAt,
        lastActive: session.updatedAt,
        expiresAt: session.expiresAt,
        current: session.token === currentToken,
      }
    })
    .sort((a, b) => {
      if (a.current !== b.current) return a.current ? -1 : 1
      return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
    })

  return c.json({ devices })
})

accountRoutes.post("/devices/revoke", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { id?: string } | null
  if (!body?.id) return c.json({ error: "invalid input" }, 400)

  const headers = c.req.raw.headers
  const sessions = await auth.api.listSessions({ headers })
  const target = sessions.find((session) => session.id === body.id)
  if (!target) return c.json({ error: "not found" }, 404)

  await auth.api.revokeSession({ headers, body: { token: target.token } })
  return c.json({ ok: true })
})
