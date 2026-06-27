import { can } from "@workspace/auth"
import { config } from "@workspace/config"
import { type Context, Hono } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { createMiddleware } from "hono/factory"
import { z } from "zod"
import { getSessionUser } from "../context"
import { checkForUpdate } from "../version/service"
import { buildConsentUrl, exchangeCodeForRefreshToken } from "./gdrive"
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

adminRoutes.get("/update-check", guard("admin.instance.manage"), async (c) => {
  return c.json({ update: await checkForUpdate() })
})

adminRoutes.get("/users", guard("admin.users.manage"), async (c) => {
  return c.json({ users: await adminService.listUsers() })
})

adminRoutes.post("/users", guard("admin.users.manage"), async (c) => {
  const parsed = await parse(
    c,
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1),
      role: z.enum(["user", "admin"]).optional(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  try {
    const user = await adminService.createUser(parsed.data)
    await adminService.recordAudit({
      actorId: c.get("userId"),
      action: "user.create",
      targetType: "user",
      targetId: user.id,
    })
    return c.json({ user }, 201)
  } catch (error) {
    const message = error instanceof adminService.AdminError ? error.message : "admin.createUserFailed"
    return c.json({ error: message }, 400)
  }
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
      instanceName: z.string().nullable().optional(),
      logoUrl: z.string().nullable().optional(),
      accentColor: z.string().nullable().optional(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  const settings = await adminService.updateSettings(parsed.data)
  await adminService.recordAudit({ actorId: c.get("userId"), action: "settings.update" })
  return c.json({ settings })
})

adminRoutes.get("/overview", guard("admin.instance.manage"), async (c) => {
  return c.json({ overview: await adminService.getOverview() })
})

adminRoutes.get("/apps", guard("admin.apps.manage"), async (c) => {
  return c.json({ apps: await adminService.listAppEnablement() })
})

adminRoutes.get("/limits", guard("admin.limits.manage"), async (c) => {
  return c.json({ limits: await adminService.listLimits() })
})

adminRoutes.get("/audit", guard("admin.audit.read"), async (c) => {
  return c.json({ entries: await adminService.listAudit() })
})

adminRoutes.get("/backup/settings", guard("admin.backup.manage"), async (c) => {
  return c.json({ settings: await adminService.getBackupSettings() })
})

adminRoutes.patch("/backup/settings", guard("admin.backup.manage"), async (c) => {
  const parsed = await parse(
    c,
    z.object({
      enabled: z.boolean().optional(),
      provider: z.enum(["s3", "gdrive"]).optional(),
      endpoint: z.string().nullable().optional(),
      region: z.string().nullable().optional(),
      bucket: z.string().nullable().optional(),
      prefix: z.string().nullable().optional(),
      accessKeyId: z.string().nullable().optional(),
      secretAccessKey: z.string().nullable().optional(),
      forcePathStyle: z.boolean().optional(),
      gdriveFolderId: z.string().nullable().optional(),
      frequencyHours: z.number().int().positive().optional(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  const settings = await adminService.updateBackupSettings(parsed.data)
  await adminService.recordAudit({ actorId: c.get("userId"), action: "backup.settings" })
  return c.json({ settings })
})

adminRoutes.get("/backup/runs", guard("admin.backup.manage"), async (c) => {
  return c.json({ runs: await adminService.listBackupRuns() })
})

adminRoutes.post("/backup/run", guard("admin.backup.manage"), async (c) => {
  const run = await adminService.triggerBackup()
  await adminService.recordAudit({
    actorId: c.get("userId"),
    action: "backup.run",
    targetType: "backup",
    targetId: run.id,
  })
  return c.json({ run }, 201)
})

adminRoutes.get("/backup/gdrive/auth", guard("admin.backup.manage"), (c) => {
  if (!config.google.clientId || !config.google.clientSecret) {
    return c.json({ error: "admin.gdriveNotConfigured" }, 400)
  }
  const state = crypto.randomUUID()
  setCookie(c, "gdrive_oauth_state", state, {
    httpOnly: true,
    sameSite: "Lax",
    maxAge: 600,
    path: "/",
  })
  return c.redirect(buildConsentUrl(state))
})

adminRoutes.get("/backup/gdrive/callback", guard("admin.backup.manage"), async (c) => {
  const code = c.req.query("code")
  const state = c.req.query("state")
  const saved = getCookie(c, "gdrive_oauth_state")
  deleteCookie(c, "gdrive_oauth_state", { path: "/" })
  if (!code || !state || state !== saved) return c.json({ error: "admin.invalidOauthState" }, 400)
  try {
    const refreshToken = await exchangeCodeForRefreshToken(code)
    await adminService.setGdriveRefreshToken(refreshToken)
    await adminService.recordAudit({ actorId: c.get("userId"), action: "backup.gdrive.connect" })
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "admin.gdriveConnectFailed" }, 400)
  }
  return c.redirect(`${config.web.url}/admin/backup`)
})

adminRoutes.post("/backup/gdrive/disconnect", guard("admin.backup.manage"), async (c) => {
  const settings = await adminService.clearGdrive()
  await adminService.recordAudit({ actorId: c.get("userId"), action: "backup.gdrive.disconnect" })
  return c.json({ settings })
})

adminRoutes.get("/users/:id", guard("admin.users.manage"), async (c) => {
  const detail = await adminService.getUserDetail(c.req.param("id"))
  if (!detail) return c.json({ error: "notFound" }, 404)
  return c.json({ user: detail })
})

adminRoutes.post("/users/:id/ban", guard("admin.users.manage"), async (c) => {
  const parsed = await parse(c, z.object({ banned: z.boolean(), reason: z.string().optional() }))
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  await adminService.setUserBanned(c.req.param("id"), parsed.data.banned, parsed.data.reason)
  await adminService.recordAudit({
    actorId: c.get("userId"),
    action: parsed.data.banned ? "user.ban" : "user.unban",
    targetType: "user",
    targetId: c.req.param("id"),
  })
  return c.json({ ok: true })
})

adminRoutes.post("/users/:id/role", guard("admin.users.manage"), async (c) => {
  const parsed = await parse(c, z.object({ role: z.string().nullable() }))
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  await adminService.setUserRole(c.req.param("id"), parsed.data.role)
  await adminService.recordAudit({
    actorId: c.get("userId"),
    action: "user.role",
    targetType: "user",
    targetId: c.req.param("id"),
    metadata: { role: parsed.data.role },
  })
  return c.json({ ok: true })
})

adminRoutes.get("/roles", guard("admin.roles.manage"), async (c) => {
  return c.json({ roles: await adminService.listRoles() })
})

adminRoutes.get("/permissions", guard("admin.roles.manage"), async (c) => {
  return c.json({ permissions: adminService.listPermissions() })
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
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  return c.json({ role: await adminService.createRole(parsed.data) }, 201)
})

adminRoutes.get("/roles/:id", guard("admin.roles.manage"), async (c) => {
  const role = await adminService.getRoleDetail(c.req.param("id"))
  if (!role) return c.json({ error: "notFound" }, 404)
  return c.json({ role })
})

adminRoutes.patch("/roles/:id", guard("admin.roles.manage"), async (c) => {
  const parsed = await parse(
    c,
    z.object({
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      permissions: z.array(z.string()).optional(),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  try {
    const role = await adminService.updateRole(c.req.param("id"), parsed.data)
    await adminService.recordAudit({
      actorId: c.get("userId"),
      action: "role.update",
      targetType: "role",
      targetId: c.req.param("id"),
    })
    return c.json({ role })
  } catch (error) {
    if (error instanceof adminService.AdminError) {
      return c.json({ error: error.message }, error.message === "notFound" ? 404 : 400)
    }
    throw error
  }
})

adminRoutes.delete("/roles/:id", guard("admin.roles.manage"), async (c) => {
  try {
    await adminService.deleteRole(c.req.param("id"))
    await adminService.recordAudit({
      actorId: c.get("userId"),
      action: "role.delete",
      targetType: "role",
      targetId: c.req.param("id"),
    })
    return c.json({ ok: true })
  } catch (error) {
    if (error instanceof adminService.AdminError) {
      return c.json({ error: error.message }, error.message === "notFound" ? 404 : 400)
    }
    throw error
  }
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
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  const assignment = await adminService.assignRole(parsed.data)
  await adminService.recordAudit({
    actorId: c.get("userId"),
    action: "role.assign",
    targetType: "user",
    targetId: parsed.data.userId,
    metadata: { roleId: parsed.data.roleId },
  })
  return c.json({ assignment }, 201)
})

adminRoutes.delete("/role-assignments", guard("admin.roles.manage"), async (c) => {
  const parsed = await parse(
    c,
    z.object({ userId: z.string().min(1), roleId: z.string().min(1) }),
  )
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  await adminService.unassignRole(parsed.data.userId, parsed.data.roleId)
  await adminService.recordAudit({
    actorId: c.get("userId"),
    action: "role.unassign",
    targetType: "user",
    targetId: parsed.data.userId,
    metadata: { roleId: parsed.data.roleId },
  })
  return c.json({ ok: true })
})

adminRoutes.get("/groups", guard("admin.groups.manage"), async (c) => {
  return c.json({ groups: await adminService.listGroups() })
})

adminRoutes.get("/groups/:id", guard("admin.groups.manage"), async (c) => {
  const detail = await adminService.getGroupDetail(c.req.param("id"))
  if (!detail) return c.json({ error: "notFound" }, 404)
  return c.json({ group: detail })
})

adminRoutes.post("/groups", guard("admin.groups.manage"), async (c) => {
  const parsed = await parse(
    c,
    z.object({ name: z.string().min(1), description: z.string().optional() }),
  )
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  return c.json({ group: await adminService.createGroup(parsed.data) }, 201)
})

adminRoutes.post("/groups/:id/members", guard("admin.groups.manage"), async (c) => {
  const parsed = await parse(c, z.object({ userId: z.string().min(1) }))
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
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
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  const limit = await adminService.setLimit(parsed.data)
  await adminService.recordAudit({
    actorId: c.get("userId"),
    action: "limit.set",
    targetType: parsed.data.subjectType,
    targetId: parsed.data.subjectId,
    metadata: { key: parsed.data.key, value: parsed.data.value },
  })
  return c.json({ limit })
})

adminRoutes.delete("/limits", guard("admin.limits.manage"), async (c) => {
  const parsed = await parse(
    c,
    z.object({
      subjectType: z.enum(["user", "group", "instance"]),
      subjectId: z.string().min(1),
      key: z.string().min(1),
    }),
  )
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  await adminService.clearLimit(parsed.data.subjectType, parsed.data.subjectId, parsed.data.key)
  await adminService.recordAudit({
    actorId: c.get("userId"),
    action: "limit.clear",
    targetType: parsed.data.subjectType,
    targetId: parsed.data.subjectId,
    metadata: { key: parsed.data.key },
  })
  return c.json({ ok: true })
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
  if (!parsed.success) return c.json({ error: "invalidInput" }, 400)
  const enablement = await adminService.setAppEnablement({
    appId: c.req.param("appId"),
    ...parsed.data,
  })
  await adminService.recordAudit({
    actorId: c.get("userId"),
    action: parsed.data.enabled ? "app.enable" : "app.disable",
    targetType: "app",
    targetId: c.req.param("appId"),
  })
  return c.json({ enablement })
})
