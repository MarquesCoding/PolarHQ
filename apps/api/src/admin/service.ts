import { db, schema } from "@workspace/db"
import { resolveLimit } from "@workspace/auth"
import { and, count, desc, eq, isNull, sql } from "drizzle-orm"
import { getAppsForUser } from "../apps/service"
import { getInstanceSettings, updateInstanceSettings } from "../instance"
import { LIMIT_CATALOG } from "./limits"

export const listUsers = async () => {
  return db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      role: schema.user.role,
      banned: schema.user.banned,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .orderBy(desc(schema.user.createdAt))
}

export const listRoles = async () => db.select().from(schema.roles).orderBy(schema.roles.name)

export interface CreateRoleInput {
  name: string
  description?: string
  permissions: string[]
}

export const createRole = async (input: CreateRoleInput) => {
  const inserted = await db
    .insert(schema.roles)
    .values({ name: input.name, description: input.description, isSystem: false, scopeType: "global" })
    .returning()
  const role = inserted[0]
  if (!role) throw new Error("Failed to create role")

  if (input.permissions.length > 0) {
    await db.insert(schema.rolePermissions).values(
      input.permissions.map((permission) => ({
        roleId: role.id,
        permission,
        effect: "allow" as const,
        scopeType: "global" as const,
      })),
    )
  }
  return role
}

export interface AssignRoleInput {
  userId: string
  roleId: string
  scopeType?: "global" | "app" | "resource"
  scopeValue?: string
}

export const assignRole = async (input: AssignRoleInput) => {
  const inserted = await db
    .insert(schema.subjectRoles)
    .values({
      subjectType: "user",
      subjectId: input.userId,
      roleId: input.roleId,
      scopeType: input.scopeType ?? "global",
      scopeValue: input.scopeValue,
    })
    .returning()
  return inserted[0]
}

export const listGroups = async () => db.select().from(schema.groups).orderBy(schema.groups.name)

export const createGroup = async (input: { name: string; description?: string }) => {
  const inserted = await db
    .insert(schema.groups)
    .values({ name: input.name, description: input.description })
    .returning()
  const group = inserted[0]
  if (!group) throw new Error("Failed to create group")
  return group
}

export const addGroupMember = async (groupId: string, userId: string) => {
  await db
    .insert(schema.groupMembers)
    .values({ groupId, userId })
    .onConflictDoNothing()
}

export const removeGroupMember = async (groupId: string, userId: string) => {
  await db
    .delete(schema.groupMembers)
    .where(and(eq(schema.groupMembers.groupId, groupId), eq(schema.groupMembers.userId, userId)))
}

export interface SetLimitInput {
  subjectType: "user" | "group" | "instance"
  subjectId: string
  key: string
  value: unknown
}

/** Set (upsert) a limit value for a user, group, or the instance default. */
export const setLimit = async (input: SetLimitInput) => {
  const inserted = await db
    .insert(schema.limits)
    .values({
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      key: input.key,
      value: input.value,
    })
    .onConflictDoUpdate({
      target: [schema.limits.subjectType, schema.limits.subjectId, schema.limits.key],
      set: { value: input.value },
    })
    .returning()
  return inserted[0]
}

export const setAppEnablement = async (input: {
  appId: string
  scopeType: "global" | "app" | "resource"
  scopeValue?: string
  enabled: boolean
}) => {
  const inserted = await db
    .insert(schema.appEnablement)
    .values({
      appId: input.appId,
      scopeType: input.scopeType,
      scopeValue: input.scopeValue,
      enabled: input.enabled,
    })
    .onConflictDoUpdate({
      target: [schema.appEnablement.scopeType, schema.appEnablement.scopeValue, schema.appEnablement.appId],
      set: { enabled: input.enabled },
    })
    .returning()
  return inserted[0]
}

export const getSettings = async () => getInstanceSettings()

export const updateSettings = async (patch: {
  registrationMode?: "invite_only" | "open" | "closed"
  allowedEmailDomains?: string[] | null
  instanceName?: string | null
  logoUrl?: string | null
  accentColor?: string | null
}) => updateInstanceSettings(patch)

const SUITE_OWNER_FALLBACK = "instance"

/** Instance-wide stats for the admin overview dashboard. */
export const getOverview = async () => {
  const [users] = await db.select({ value: count() }).from(schema.user)
  const [banned] = await db
    .select({ value: count() })
    .from(schema.user)
    .where(eq(schema.user.banned, true))
  const [groups] = await db.select({ value: count() }).from(schema.groups)
  const [roles] = await db.select({ value: count() }).from(schema.roles)

  const [photoBytes] = await db
    .select({ value: sql<string>`coalesce(sum(${schema.assets.sizeBytes}), 0)` })
    .from(schema.assets)
    .where(eq(schema.assets.isTrashed, false))
  const [fileBytes] = await db
    .select({ value: sql<string>`coalesce(sum(${schema.nodes.sizeBytes}), 0)` })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.kind, "file"),
        isNull(schema.nodes.photoAssetId),
        isNull(schema.nodes.trashedAt),
      ),
    )

  const apps = await getAppsForUser(SUITE_OWNER_FALLBACK).catch(() => [])
  return {
    users: users?.value ?? 0,
    bannedUsers: banned?.value ?? 0,
    groups: groups?.value ?? 0,
    roles: roles?.value ?? 0,
    storageBytes: Number(photoBytes?.value ?? 0) + Number(fileBytes?.value ?? 0),
    appsAvailable: apps.filter((app) => app.status === "available").length,
  }
}

/** Apps with their resolved global enablement flag, for the Apps admin tab. */
export const listAppEnablement = async () => {
  const apps = await getAppsForUser(SUITE_OWNER_FALLBACK).catch(() => [])
  const rows = await db
    .select()
    .from(schema.appEnablement)
    .where(eq(schema.appEnablement.scopeType, "global"))
  const enabled = new Map(rows.map((row) => [row.appId, row.enabled]))
  return apps.map((app) => ({
    id: app.id,
    name: app.name,
    description: app.description,
    icon: app.icon,
    category: app.category,
    status: app.status,
    enabled: enabled.get(app.id) ?? true,
  }))
}

/** The limit catalog with the instance-level value currently set for each key. */
export const listLimits = async () => {
  const rows = await db
    .select()
    .from(schema.limits)
    .where(eq(schema.limits.subjectType, "instance"))
  const values = new Map(rows.map((row) => [row.key, row.value]))
  return LIMIT_CATALOG.map((def) => ({
    key: def.key,
    label: def.label,
    description: def.description,
    type: def.type,
    value: (values.get(def.key) ?? null) as number | string | boolean | null,
  }))
}

/** Ban or unban a user (a banned user's sessions are rejected by better-auth). */
export const setUserBanned = async (userId: string, banned: boolean, reason?: string) => {
  await db
    .update(schema.user)
    .set({ banned, banReason: banned ? (reason ?? null) : null, updatedAt: new Date() })
    .where(eq(schema.user.id, userId))
}

/** Set a user's coarse better-auth role string (e.g. "admin", "user"). */
export const setUserRole = async (userId: string, role: string | null) => {
  await db
    .update(schema.user)
    .set({ role, updatedAt: new Date() })
    .where(eq(schema.user.id, userId))
}

/** Full detail for one user: profile, role assignments, group memberships, resolved limits. */
export const getUserDetail = async (userId: string) => {
  const rows = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      role: schema.user.role,
      banned: schema.user.banned,
      banReason: schema.user.banReason,
      createdAt: schema.user.createdAt,
    })
    .from(schema.user)
    .where(eq(schema.user.id, userId))
    .limit(1)
  const profile = rows[0]
  if (!profile) return null

  const roleRows = await db
    .select({ id: schema.roles.id, name: schema.roles.name })
    .from(schema.subjectRoles)
    .innerJoin(schema.roles, eq(schema.roles.id, schema.subjectRoles.roleId))
    .where(
      and(
        eq(schema.subjectRoles.subjectType, "user"),
        eq(schema.subjectRoles.subjectId, userId),
      ),
    )
  const groupRows = await db
    .select({ id: schema.groups.id, name: schema.groups.name })
    .from(schema.groupMembers)
    .innerJoin(schema.groups, eq(schema.groups.id, schema.groupMembers.groupId))
    .where(eq(schema.groupMembers.userId, userId))

  const overrideRows = await db
    .select({ key: schema.limits.key, value: schema.limits.value })
    .from(schema.limits)
    .where(
      and(eq(schema.limits.subjectType, "user"), eq(schema.limits.subjectId, userId)),
    )
  const overrides = new Map(overrideRows.map((row) => [row.key, row.value]))

  const limits = await Promise.all(
    LIMIT_CATALOG.map(async (def) => ({
      key: def.key,
      label: def.label,
      value: (await resolveLimit(userId, def.key)) as number | string | boolean | null,
      hasOverride: overrides.has(def.key),
      override: (overrides.get(def.key) ?? null) as number | string | boolean | null,
    })),
  )
  return { ...profile, roles: roleRows, groups: groupRows, limits }
}

/** Assign one of the catalog roles to a user via the RBAC subject_roles table. */
export const unassignRole = async (userId: string, roleId: string) => {
  await db
    .delete(schema.subjectRoles)
    .where(
      and(
        eq(schema.subjectRoles.subjectType, "user"),
        eq(schema.subjectRoles.subjectId, userId),
        eq(schema.subjectRoles.roleId, roleId),
      ),
    )
}

/** Remove a limit override so the subject falls back to the inherited/instance value. */
export const clearLimit = async (
  subjectType: "user" | "group" | "instance",
  subjectId: string,
  key: string,
) => {
  await db
    .delete(schema.limits)
    .where(
      and(
        eq(schema.limits.subjectType, subjectType),
        eq(schema.limits.subjectId, subjectId),
        eq(schema.limits.key, key),
      ),
    )
}

/** Recent audit-log entries, newest first. */
export const listAudit = async (limit = 100) =>
  db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.createdAt)).limit(limit)

/** Append an audit-log entry. */
export const recordAudit = async (entry: {
  actorId: string
  action: string
  targetType?: string
  targetId?: string
  metadata?: unknown
}) => {
  await db.insert(schema.auditLog).values({
    actorId: entry.actorId,
    action: entry.action,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId ?? null,
    metadata: entry.metadata ?? null,
  })
}
