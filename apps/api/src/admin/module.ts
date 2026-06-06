import { type PermissionDef, registerPermissions } from "@workspace/auth"
import { registerLimitCatalog } from "./limits"

export const ADMIN_PERMISSIONS: PermissionDef[] = [
  { key: "admin.instance.manage", description: "Manage instance settings", resource: "instance", action: "manage" },
  { key: "admin.registration.manage", description: "Manage registration mode", resource: "registration", action: "manage" },
  { key: "admin.users.manage", description: "Manage users", resource: "users", action: "manage" },
  { key: "admin.groups.manage", description: "Manage groups", resource: "groups", action: "manage" },
  { key: "admin.roles.manage", description: "Manage roles and permissions", resource: "roles", action: "manage" },
  { key: "admin.limits.manage", description: "Manage quotas and limits", resource: "limits", action: "manage" },
  { key: "admin.apps.manage", description: "Enable or disable apps", resource: "apps", action: "manage" },
  { key: "admin.audit.read", description: "View the audit log", resource: "audit", action: "read" },
]

/** Register the admin permission catalog into the shared registry. */
export const registerAdminModule = (): void => {
  registerPermissions(ADMIN_PERMISSIONS)
  registerLimitCatalog()
}
