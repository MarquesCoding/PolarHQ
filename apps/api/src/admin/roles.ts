import { db, schema } from "@workspace/db"
import { and, eq, sql } from "drizzle-orm"

export interface SystemRoleDef {
  name: string
  description: string
  permissions: string[]
}

/**
 * Built-in roles seeded on first setup. System roles are immutable; admins
 * clone them to make editable custom roles.
 */
export const SYSTEM_ROLES: SystemRoleDef[] = [
  { name: "Owner", description: "Full control of the instance", permissions: ["*.*"] },
  {
    name: "Admin",
    description: "Administer users, groups, roles, limits, and apps",
    permissions: ["admin.*", "photos.*"],
  },
  {
    name: "User",
    description: "Standard user with access to enabled apps",
    permissions: [
      "photos.asset.read",
      "photos.asset.create",
      "photos.asset.update",
      "photos.asset.delete",
      "photos.album.create",
      "photos.album.share",
      "drive.file.read",
      "drive.file.create",
      "drive.file.update",
      "drive.file.delete",
      "docs.document.read",
      "docs.document.create",
      "docs.document.update",
      "docs.document.delete",
      "docs.document.share",
    ],
  },
]

export const getRoleByName = async (name: string) => {
  const rows = await db.select().from(schema.roles).where(eq(schema.roles.name, name)).limit(1)
  return rows[0] ?? null
}

/**
 * Idempotently create the built-in system roles and (re)sync their permission sets to match the
 * definitions above — so broadening a system role here propagates to an already-set-up instance the
 * next time this runs, rather than only on a fresh install.
 */
export const seedSystemRoles = async (): Promise<void> => {
  for (const def of SYSTEM_ROLES) {
    const existing = await db
      .select()
      .from(schema.roles)
      .where(and(eq(schema.roles.name, def.name), eq(schema.roles.isSystem, true)))
      .limit(1)

    let roleId = existing[0]?.id
    if (!roleId) {
      const inserted = await db
        .insert(schema.roles)
        .values({
          name: def.name,
          description: def.description,
          isSystem: true,
          scopeType: "global",
        })
        .returning()
      const role = inserted[0]
      if (!role) throw new Error(`Failed to seed role ${def.name}`)
      roleId = role.id
    }

    // Re-sync permissions: clear and re-insert so the role always matches the def.
    await db.delete(schema.rolePermissions).where(eq(schema.rolePermissions.roleId, roleId))
    await db.insert(schema.rolePermissions).values(
      def.permissions.map((permission) => ({
        roleId,
        permission,
        effect: "allow" as const,
        scopeType: "global" as const,
      })),
    )
  }
}

/**
 * Give the built-in "User" role to any account that has no role yet. New users get it via the
 * better-auth create hook; this backfills accounts created before that existed (e.g. on a fresh
 * deploy) so nobody is left with an empty app switcher. Safe to run on every boot.
 */
export const backfillDefaultRoles = async (): Promise<void> => {
  const role = await getRoleByName("User")
  if (!role) return
  const roleless = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(
      sql`not exists (select 1 from ${schema.subjectRoles} sr where sr.subject_id = ${schema.user.id})`,
    )
  if (roleless.length === 0) return
  await db
    .insert(schema.subjectRoles)
    .values(
      roleless.map((user) => ({
        subjectType: "user" as const,
        subjectId: user.id,
        roleId: role.id,
        scopeType: "global" as const,
      })),
    )
    .onConflictDoNothing()
}
