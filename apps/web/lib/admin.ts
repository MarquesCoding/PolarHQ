import { apiFetch } from "@lib/apiClient"

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string | null
  banned: boolean | null
  createdAt: string
}

export interface AdminOverview {
  users: number
  bannedUsers: number
  groups: number
  roles: number
  storageBytes: number
  appsAvailable: number
}

export interface AdminAppRow {
  id: string
  name: string
  description: string
  icon: string
  category: string
  status: "available" | "coming_soon"
  enabled: boolean
}

export type LimitValue = number | string | boolean | null

export interface AdminLimit {
  key: string
  label: string
  description: string
  type: string
  value: LimitValue
}

export interface AdminGroup {
  id: string
  name: string
  description: string | null
  createdAt: string
}

export interface AdminRole {
  id: string
  name: string
  description: string | null
  isSystem: boolean
  scopeType: string
  createdAt: string
}

export interface AdminAuditEntry {
  id: string
  actorId: string | null
  action: string
  targetType: string | null
  targetId: string | null
  metadata: unknown
  createdAt: string
}

export interface AdminSettings {
  registrationMode: "invite_only" | "open" | "closed"
  allowedEmailDomains: string[] | null
  instanceName: string | null
  logoUrl: string | null
  accentColor: string | null
  setupCompleted: boolean
}

export interface AdminUserDetail extends AdminUser {
  banReason: string | null
  roles: { id: string; name: string }[]
  groups: { id: string; name: string }[]
  limits: { key: string; label: string; value: LimitValue }[]
}

export const fetchOverview = (): Promise<AdminOverview> =>
  apiFetch<{ overview: AdminOverview }>("/api/v1/admin/overview").then((r) => r.overview)

export const fetchAdminUsers = (): Promise<AdminUser[]> =>
  apiFetch<{ users: AdminUser[] }>("/api/v1/admin/users").then((r) => r.users)

export const fetchAdminUser = (id: string): Promise<AdminUserDetail> =>
  apiFetch<{ user: AdminUserDetail }>(`/api/v1/admin/users/${id}`).then((r) => r.user)

export const setUserBanned = (id: string, banned: boolean, reason?: string): Promise<unknown> =>
  apiFetch(`/api/v1/admin/users/${id}/ban`, {
    method: "POST",
    body: JSON.stringify({ banned, reason }),
  })

export const setUserRole = (id: string, role: string | null): Promise<unknown> =>
  apiFetch(`/api/v1/admin/users/${id}/role`, {
    method: "POST",
    body: JSON.stringify({ role }),
  })

export const fetchAdminApps = (): Promise<AdminAppRow[]> =>
  apiFetch<{ apps: AdminAppRow[] }>("/api/v1/admin/apps").then((r) => r.apps)

export const setAppEnabled = (appId: string, enabled: boolean): Promise<unknown> =>
  apiFetch(`/api/v1/admin/apps/${appId}`, {
    method: "PUT",
    body: JSON.stringify({ scopeType: "global", enabled }),
  })

export const fetchAdminLimits = (): Promise<AdminLimit[]> =>
  apiFetch<{ limits: AdminLimit[] }>("/api/v1/admin/limits").then((r) => r.limits)

export const setInstanceLimit = (key: string, value: LimitValue): Promise<unknown> =>
  apiFetch("/api/v1/admin/limits", {
    method: "PUT",
    body: JSON.stringify({ subjectType: "instance", subjectId: "instance", key, value }),
  })

export const fetchAdminGroups = (): Promise<AdminGroup[]> =>
  apiFetch<{ groups: AdminGroup[] }>("/api/v1/admin/groups").then((r) => r.groups)

export const createAdminGroup = (name: string, description?: string): Promise<unknown> =>
  apiFetch("/api/v1/admin/groups", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  })

export const addGroupMember = (groupId: string, userId: string): Promise<unknown> =>
  apiFetch(`/api/v1/admin/groups/${groupId}/members`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  })

export const removeGroupMember = (groupId: string, userId: string): Promise<unknown> =>
  apiFetch(`/api/v1/admin/groups/${groupId}/members/${userId}`, { method: "DELETE" })

export const fetchAdminRoles = (): Promise<AdminRole[]> =>
  apiFetch<{ roles: AdminRole[] }>("/api/v1/admin/roles").then((r) => r.roles)

export const createAdminRole = (
  name: string,
  description: string,
  permissions: string[],
): Promise<unknown> =>
  apiFetch("/api/v1/admin/roles", {
    method: "POST",
    body: JSON.stringify({ name, description, permissions }),
  })

export const assignRole = (userId: string, roleId: string): Promise<unknown> =>
  apiFetch("/api/v1/admin/role-assignments", {
    method: "POST",
    body: JSON.stringify({ userId, roleId }),
  })

export const fetchAdminSettings = (): Promise<AdminSettings> =>
  apiFetch<{ settings: AdminSettings }>("/api/v1/admin/settings").then((r) => r.settings)

export const updateAdminSettings = (patch: Partial<AdminSettings>): Promise<unknown> =>
  apiFetch("/api/v1/admin/settings", { method: "PATCH", body: JSON.stringify(patch) })

export const fetchAdminAudit = (): Promise<AdminAuditEntry[]> =>
  apiFetch<{ entries: AdminAuditEntry[] }>("/api/v1/admin/audit").then((r) => r.entries)

const UNITS = ["B", "KB", "MB", "GB", "TB"]

/** Human-readable byte size (e.g. 1.5 GB). */
export const formatBytes = (bytes: number): string => {
  if (bytes <= 0) return "0 B"
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${UNITS[exponent]}`
}
