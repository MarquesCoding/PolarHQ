import { db, schema } from "@workspace/db"
import { and, desc, eq } from "drizzle-orm"
import { getInstanceSettings, updateInstanceSettings } from "../instance"

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
}) => updateInstanceSettings(patch)
