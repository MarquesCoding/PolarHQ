import { db, schema } from "@workspace/db"
import { inArray } from "drizzle-orm"

export type PermissionAction =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "share"
  | "manage"
  | "admin"

export interface PermissionDef {
  key: string
  description: string
  resource: string
  action: PermissionAction
}

export type ScopeKind = "global" | "app" | "resource"

export interface Scope {
  type: ScopeKind
  value?: string
}

const catalog = new Map<string, PermissionDef>()

/** Register an app's permission catalog. Called by each app module at boot. */
export const registerPermissions = (defs: PermissionDef[]): void => {
  for (const def of defs) catalog.set(def.key, def)
}

export const getPermissionCatalog = (): PermissionDef[] => [...catalog.values()]

const matchPermission = (pattern: string, requested: string): boolean => {
  if (pattern === "*" || pattern === "*.*") return true
  if (pattern.endsWith(".*")) {
    return requested === pattern.slice(0, -2) || requested.startsWith(pattern.slice(0, -1))
  }
  return pattern === requested
}

const scopeCovers = (
  grantType: ScopeKind,
  grantValue: string | null,
  requested: Scope,
): boolean => {
  if (grantType === "global") return true
  if (grantType === "app") return requested.type === "app" && grantValue === requested.value
  if (grantType === "resource") return requested.type === "resource" && grantValue === requested.value
  return false
}

const getGroupIds = async (userId: string): Promise<string[]> => {
  const rows = await db
    .select({ groupId: schema.groupMembers.groupId })
    .from(schema.groupMembers)
    .where(inArray(schema.groupMembers.userId, [userId]))
  return rows.map((row) => row.groupId)
}

interface Candidate {
  permission: string
  effect: "allow" | "deny"
  scopeType: ScopeKind
  scopeValue: string | null
}

/**
 * Resolve whether a user may perform a permission within a scope.
 * Default-deny; an explicit `deny` grant always wins over any `allow`.
 */
export const can = async (
  userId: string,
  permission: string,
  scope: Scope = { type: "global" },
): Promise<boolean> => {
  const groupIds = await getGroupIds(userId)
  const subjectIds = [userId, ...groupIds]

  const assignments = await db
    .select({ roleId: schema.subjectRoles.roleId })
    .from(schema.subjectRoles)
    .where(inArray(schema.subjectRoles.subjectId, subjectIds))
  const roleIds = assignments.map((row) => row.roleId)

  const rolePerms = roleIds.length
    ? await db.select().from(schema.rolePermissions).where(inArray(schema.rolePermissions.roleId, roleIds))
    : []
  const directGrants = await db
    .select()
    .from(schema.permissionGrants)
    .where(inArray(schema.permissionGrants.subjectId, subjectIds))

  const candidates: Candidate[] = [
    ...rolePerms.map((p) => ({
      permission: p.permission,
      effect: p.effect,
      scopeType: p.scopeType,
      scopeValue: p.scopeValue,
    })),
    ...directGrants.map((g) => ({
      permission: g.permission,
      effect: g.effect,
      scopeType: g.scopeType,
      scopeValue: g.scopeValue,
    })),
  ]

  let allowed = false
  for (const candidate of candidates) {
    if (!matchPermission(candidate.permission, permission)) continue
    if (!scopeCovers(candidate.scopeType, candidate.scopeValue, scope)) continue
    if (candidate.effect === "deny") return false
    allowed = true
  }
  return allowed
}
