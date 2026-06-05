import { can } from "@workspace/auth"
import { type Context, Hono } from "hono"
import { createMiddleware } from "hono/factory"
import { z } from "zod"
import { getSessionUser } from "../context"
import * as adminService from "./service"

type Variables = { userId: string }

export const adminRoutes = new Hono<{ Variables: Variables }>()

const guard = (permission: string) =>
  createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const user = await getSessionUser(c.req.raw.headers)
    if (!user) return c.json({ error: "unauthorized" }, 401)
    if (!(await can(user.id, permission))) return c.json({ error: "forbidden" }, 403)
    c.set("userId", user.id)
    await next()
  })

const parse = async <T>(c: Context, schema: z.ZodType<T>) => {
  const body = await c.req.json().catch(() => null)
  return schema.safeParse(body)
}

adminRoutes.get("/users", guard("admin.users.manage"), async (c) => {
  return c.json({ users: await adminService.listUsers() })
})

adminRoutes.get("/settings", guard("admin.registration.manage"), async (c) => {
  return c.json({ settings: await adminService.getSettings() })
})

adminRoutes.patch("/settings", guard("admin.registration.manage"), async (c) => {
  const parsed = await parse(
    c,
    z.object({
      registrationMode: z.enum(["invite_only", "open", "closed"]).optional(),
      allowedEmailDomains: z.array(z.string()).nullable().optional(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  return c.json({ settings: await adminService.updateSettings(parsed.data) })
})

adminRoutes.get("/roles", guard("admin.roles.manage"), async (c) => {
  return c.json({ roles: await adminService.listRoles() })
})

adminRoutes.post("/roles", guard("admin.roles.manage"), async (c) => {
  const parsed = await parse(
    c,
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      permissions: z.array(z.string()).default([]),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  return c.json({ role: await adminService.createRole(parsed.data) }, 201)
})

adminRoutes.post("/role-assignments", guard("admin.roles.manage"), async (c) => {
  const parsed = await parse(
    c,
    z.object({
      userId: z.string().min(1),
      roleId: z.string().min(1),
      scopeType: z.enum(["global", "app", "resource"]).optional(),
      scopeValue: z.string().optional(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  return c.json({ assignment: await adminService.assignRole(parsed.data) }, 201)
})

adminRoutes.get("/groups", guard("admin.groups.manage"), async (c) => {
  return c.json({ groups: await adminService.listGroups() })
})

adminRoutes.post("/groups", guard("admin.groups.manage"), async (c) => {
  const parsed = await parse(
    c,
    z.object({ name: z.string().min(1), description: z.string().optional() }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  return c.json({ group: await adminService.createGroup(parsed.data) }, 201)
})

adminRoutes.post("/groups/:id/members", guard("admin.groups.manage"), async (c) => {
  const parsed = await parse(c, z.object({ userId: z.string().min(1) }))
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  await adminService.addGroupMember(c.req.param("id"), parsed.data.userId)
  return c.json({ ok: true }, 201)
})

adminRoutes.delete("/groups/:id/members/:userId", guard("admin.groups.manage"), async (c) => {
  await adminService.removeGroupMember(c.req.param("id"), c.req.param("userId"))
  return c.json({ ok: true })
})

adminRoutes.put("/limits", guard("admin.limits.manage"), async (c) => {
  const parsed = await parse(
    c,
    z.object({
      subjectType: z.enum(["user", "group", "instance"]),
      subjectId: z.string().min(1),
      key: z.string().min(1),
      value: z.unknown(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  return c.json({ limit: await adminService.setLimit(parsed.data) })
})

adminRoutes.put("/apps/:appId", guard("admin.apps.manage"), async (c) => {
  const parsed = await parse(
    c,
    z.object({
      scopeType: z.enum(["global", "app", "resource"]).default("global"),
      scopeValue: z.string().optional(),
      enabled: z.boolean(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalid input" }, 400)
  return c.json({
    enablement: await adminService.setAppEnablement({ appId: c.req.param("appId"), ...parsed.data }),
  })
})
