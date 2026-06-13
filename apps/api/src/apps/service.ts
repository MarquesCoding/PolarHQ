import { can } from "@polarhq/auth"
import { db, schema } from "@polarhq/db"
import { eq } from "drizzle-orm"
import { type AppManifest, listApps } from "./registry"

export interface ResolvedApp extends AppManifest {
  available: boolean
}

/**
 * Resolve which apps a user can open: declared `available`, enabled for the
 * instance, and (if gated) permitted by `can()`.
 */
export const getAppsForUser = async (userId: string): Promise<ResolvedApp[]> => {
  const enablementRows = await db
    .select()
    .from(schema.appEnablement)
    .where(eq(schema.appEnablement.scopeType, "global"))
  const enabled = new Map(enablementRows.map((row) => [row.appId, row.enabled]))

  const resolved: ResolvedApp[] = []
  for (const app of listApps()) {
    const isEnabled = enabled.get(app.id) ?? true
    let available = app.status === "available" && isEnabled
    if (available && app.requiredPermission) {
      available = await can(userId, app.requiredPermission)
    }
    resolved.push({ ...app, available })
  }
  return resolved
}
