import { createId } from "@paralleldrive/cuid2"
import {
  bigint,
  boolean,
  index,
  integer,
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
export const subjectType = core.enum("subject_type", ["user", "group", "token", "instance"])
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
  demoMode: boolean("demo_mode").notNull().default(false),
  instanceName: text("instance_name"),
  logoUrl: text("logo_url"),
  accentColor: text("accent_color"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const backupStatus = core.enum("backup_status", ["running", "completed", "failed"])

/**
 * Singleton config for scheduled off-site backups to an S3-compatible bucket. The secret access
 * key is stored here (plaintext, self-hosted) but never returned to clients.
 */
export const backupProvider = core.enum("backup_provider", ["s3", "gdrive"])

export const backupSettings = core.table("backup_settings", {
  id: text("id").primaryKey().default("singleton"),
  enabled: boolean("enabled").notNull().default(false),
  provider: backupProvider("provider").notNull().default("s3"),
  endpoint: text("endpoint"),
  region: text("region"),
  bucket: text("bucket"),
  prefix: text("prefix"),
  accessKeyId: text("access_key_id"),
  secretAccessKey: text("secret_access_key"),
  forcePathStyle: boolean("force_path_style").notNull().default(true),
  gdriveRefreshToken: text("gdrive_refresh_token"),
  gdriveFolderId: text("gdrive_folder_id"),
  frequencyHours: integer("frequency_hours").notNull().default(24),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const backupRuns = core.table(
  "backup_runs",
  {
    id: id(),
    status: backupStatus("status").notNull().default("running"),
    trigger: text("trigger").notNull(),
    objectCount: integer("object_count").notNull().default(0),
    bytes: bigint("bytes", { mode: "number" }).notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    finishedAt: timestamp("finished_at"),
  },
  (t) => [index("backup_runs_started_idx").on(t.startedAt)],
)

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
