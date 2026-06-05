import { db, schema } from "@workspace/db"
import { and, eq } from "drizzle-orm"

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
    ],
  },
]

export const getRoleByName = async (name: string) => {
  const rows = await db.select().from(schema.roles).where(eq(schema.roles.name, name)).limit(1)
  return rows[0] ?? null
}

/** Idempotently create the built-in system roles and their permissions. */
export const seedSystemRoles = async (): Promise<void> => {
  for (const def of SYSTEM_ROLES) {
    const existing = await db
      .select()
      .from(schema.roles)
      .where(and(eq(schema.roles.name, def.name), eq(schema.roles.isSystem, true)))
      .limit(1)
    if (existing[0]) continue

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

    await db.insert(schema.rolePermissions).values(
      def.permissions.map((permission) => ({
        roleId: role.id,
        permission,
        effect: "allow" as const,
        scopeType: "global" as const,
      })),
    )
  }
}
