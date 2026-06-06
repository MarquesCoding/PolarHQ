import { createId } from "@paralleldrive/cuid2"
import {
  boolean,
  index,
  jsonb,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { user } from "./auth"

/**
 * `core` schema — the shared authorization system (RBAC + limits) and
 * instance-level settings, used by every product in the suite.
 */
export const core = pgSchema("core")

export const effect = core.enum("effect", ["allow", "deny"])
export const scopeType = core.enum("scope_type", ["global", "app", "resource"])
export const subjectType = core.enum("subject_type", [
  "user",
  "group",
  "token",
  "instance",
  "workgroup",
])
export const registrationMode = core.enum("registration_mode", ["invite_only", "open", "closed"])

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => createId())

export const groups = core.table("groups", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const groupMembers = core.table(
  "group_members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
)

/**
 * Workgroups — an organisational tier above groups (e.g. a department containing several
 * teams). A workgroup owns a set of groups; roles and limits targeting a workgroup apply to
 * every member of its groups, resolved with lower precedence than a direct group grant.
 */
export const workgroups = core.table("workgroups", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const workgroupGroups = core.table(
  "workgroup_groups",
  {
    workgroupId: text("workgroup_id")
      .notNull()
      .references(() => workgroups.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workgroupId, t.groupId] })],
)

export const roles = core.table("roles", {
  id: id(),
  name: text("name").notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  scopeType: scopeType("scope_type").notNull().default("global"),
  scopeValue: text("scope_value"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const rolePermissions = core.table(
  "role_permissions",
  {
    id: id(),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permission: text("permission").notNull(),
    effect: effect("effect").notNull().default("allow"),
    scopeType: scopeType("scope_type").notNull().default("global"),
    scopeValue: text("scope_value"),
  },
  (t) => [index("role_permissions_role_idx").on(t.roleId)],
)

export const subjectRoles = core.table(
  "subject_roles",
  {
    id: id(),
    subjectType: subjectType("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    scopeType: scopeType("scope_type").notNull().default("global"),
    scopeValue: text("scope_value"),
  },
  (t) => [index("subject_roles_subject_idx").on(t.subjectType, t.subjectId)],
)

export const permissionGrants = core.table(
  "permission_grants",
  {
    id: id(),
    subjectType: subjectType("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    permission: text("permission").notNull(),
    effect: effect("effect").notNull().default("allow"),
    scopeType: scopeType("scope_type").notNull().default("global"),
    scopeValue: text("scope_value"),
  },
  (t) => [index("permission_grants_subject_idx").on(t.subjectType, t.subjectId)],
)

/**
 * Numeric/boolean/enum policies (storage quota, upload caps, sharing rules).
 * Resolved by precedence: user override > group > global default.
 */
export const limits = core.table(
  "limits",
  {
    id: id(),
    subjectType: subjectType("subject_type").notNull(),
    subjectId: text("subject_id").notNull(),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
  },
  (t) => [uniqueIndex("limits_subject_key_uq").on(t.subjectType, t.subjectId, t.key)],
)

export const appEnablement = core.table(
  "app_enablement",
  {
    id: id(),
    scopeType: scopeType("scope_type").notNull(),
    scopeValue: text("scope_value"),
    appId: text("app_id").notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (t) => [uniqueIndex("app_enablement_scope_app_uq").on(t.scopeType, t.scopeValue, t.appId)],
)

export const instanceSettings = core.table("instance_settings", {
  id: text("id").primaryKey().default("singleton"),
  registrationMode: registrationMode("registration_mode").notNull().default("invite_only"),
  allowedEmailDomains: jsonb("allowed_email_domains"),
  setupCompleted: boolean("setup_completed").notNull().default(false),
  instanceName: text("instance_name"),
  logoUrl: text("logo_url"),
  accentColor: text("accent_color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const auditLog = core.table(
  "audit_log",
  {
    id: id(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    scopeType: scopeType("scope_type"),
    scopeValue: text("scope_value"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_log_actor_idx").on(t.actorId)],
)
