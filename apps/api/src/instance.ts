import { db, schema } from "@workspace/db"
import { eq } from "drizzle-orm"

export type InstanceSettings = typeof schema.instanceSettings.$inferSelect

const SINGLETON_ID = "singleton"

/** Read instance settings, creating the singleton row on first access. */
export const getInstanceSettings = async (): Promise<InstanceSettings> => {
  const rows = await db
    .select()
    .from(schema.instanceSettings)
    .where(eq(schema.instanceSettings.id, SINGLETON_ID))
    .limit(1)
  if (rows[0]) return rows[0]

  await db.insert(schema.instanceSettings).values({ id: SINGLETON_ID }).onConflictDoNothing()
  const created = await db
    .select()
    .from(schema.instanceSettings)
    .where(eq(schema.instanceSettings.id, SINGLETON_ID))
    .limit(1)
  if (!created[0]) throw new Error("Failed to initialize instance settings")
  return created[0]
}

export interface InstanceSettingsPatch {
  registrationMode?: InstanceSettings["registrationMode"]
  allowedEmailDomains?: string[] | null
  setupCompleted?: boolean
  demoMode?: boolean
  instanceName?: string | null
  logoUrl?: string | null
  accentColor?: string | null
}

export const updateInstanceSettings = async (
  patch: InstanceSettingsPatch,
): Promise<InstanceSettings> => {
  await getInstanceSettings()
  const updated = await db
    .update(schema.instanceSettings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.instanceSettings.id, SINGLETON_ID))
    .returning()
  if (!updated[0]) throw new Error("Failed to update instance settings")
  return updated[0]
}
