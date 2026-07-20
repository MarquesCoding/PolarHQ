import { db, schema } from "@workspace/db"
import { and, desc, eq } from "drizzle-orm"

export type DeviceRow = typeof schema.devices.$inferSelect

export interface RegisterDeviceInput {
  deviceId: string
  name: string
  platform: string
  kind: string
}

/** Idempotent register: upsert the account's device keyed on its stable client `deviceId`, refreshing
 *  its name/platform and `lastSeenAt`. */
export const registerDevice = async (
  ownerId: string,
  input: RegisterDeviceInput,
): Promise<DeviceRow> => {
  const now = new Date()
  const [row] = await db
    .insert(schema.devices)
    .values({
      ownerId,
      deviceId: input.deviceId,
      name: input.name,
      platform: input.platform,
      kind: input.kind,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [schema.devices.ownerId, schema.devices.deviceId],
      set: {
        name: input.name,
        platform: input.platform,
        kind: input.kind,
        lastSeenAt: now,
        updatedAt: now,
      },
    })
    .returning()
  return row!
}

export const listDevices = async (ownerId: string): Promise<DeviceRow[]> =>
  db
    .select()
    .from(schema.devices)
    .where(eq(schema.devices.ownerId, ownerId))
    .orderBy(desc(schema.devices.lastSeenAt))

/** Refresh a device's `lastSeenAt` (heartbeat). No-op if the device isn't registered. */
export const touchDevice = async (ownerId: string, deviceId: string): Promise<void> => {
  const now = new Date()
  await db
    .update(schema.devices)
    .set({ lastSeenAt: now, updatedAt: now })
    .where(and(eq(schema.devices.ownerId, ownerId), eq(schema.devices.deviceId, deviceId)))
}

export const removeDevice = async (ownerId: string, id: string): Promise<void> => {
  await db
    .delete(schema.devices)
    .where(and(eq(schema.devices.ownerId, ownerId), eq(schema.devices.id, id)))
}
