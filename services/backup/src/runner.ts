import { decryptSecret } from "@workspace/config"
import { db, schema } from "@workspace/db"
import { S3Driver, storage } from "@workspace/storage"
import { eq } from "drizzle-orm"

const SINGLETON = "singleton"

const getSettings = async () => {
  const rows = await db
    .select()
    .from(schema.backupSettings)
    .where(eq(schema.backupSettings.id, SINGLETON))
    .limit(1)
  return rows[0] ?? null
}

const normalizePrefix = (prefix: string | null): string => {
  if (!prefix) return ""
  return prefix.endsWith("/") ? prefix : `${prefix}/`
}

/** Insert a backup-run row in the `running` state and return its id. */
export const startRun = async (trigger: "manual" | "scheduled"): Promise<string> => {
  const inserted = await db
    .insert(schema.backupRuns)
    .values({ trigger, status: "running" })
    .returning({ id: schema.backupRuns.id })
  const id = inserted[0]?.id
  if (!id) throw new Error("Failed to start backup run")
  return id
}

/**
 * Copy every object from the primary storage to the configured S3 destination, recording the
 * outcome on the given run row. Buffers one object at a time; on any object error the whole run
 * is marked failed (the partial copy is left in place).
 */
export const runBackup = async (runId: string): Promise<void> => {
  const settings = await getSettings()

  const markFailed = (message: string) =>
    db
      .update(schema.backupRuns)
      .set({ status: "failed", error: message, finishedAt: new Date() })
      .where(eq(schema.backupRuns.id, runId))

  if (
    !settings?.bucket ||
    !settings.region ||
    !settings.accessKeyId ||
    !settings.secretAccessKey
  ) {
    await markFailed("Backup destination is not configured")
    return
  }

  const destination = new S3Driver({
    bucket: settings.bucket,
    region: settings.region,
    endpoint: settings.endpoint ?? undefined,
    accessKeyId: settings.accessKeyId,
    secretAccessKey: decryptSecret(settings.secretAccessKey),
    forcePathStyle: settings.forcePathStyle,
  })
  const source = storage()
  const prefix = normalizePrefix(settings.prefix)

  try {
    const objects = await source.list("")
    let objectCount = 0
    let bytes = 0
    for (const object of objects) {
      const body = await source.getStream(object.key)
      await destination.putStream({
        key: `${prefix}${object.key}`,
        body,
        contentLength: object.size,
      })
      objectCount += 1
      bytes += object.size
    }
    await db
      .update(schema.backupRuns)
      .set({ status: "completed", objectCount, bytes, finishedAt: new Date() })
      .where(eq(schema.backupRuns.id, runId))
    await db
      .update(schema.backupSettings)
      .set({ lastRunAt: new Date(), updatedAt: new Date() })
      .where(eq(schema.backupSettings.id, SINGLETON))
  } catch (error) {
    await markFailed(error instanceof Error ? error.message : "Backup failed")
  }
}

/** Run a scheduled backup if one is enabled and due (called by the hourly tick). */
export const runScheduledIfDue = async (): Promise<void> => {
  const settings = await getSettings()
  if (!settings?.enabled || !settings.bucket) return
  const dueAfterMs = settings.frequencyHours * 60 * 60 * 1000
  if (settings.lastRunAt && Date.now() - settings.lastRunAt.getTime() < dueAfterMs) return
  const runId = await startRun("scheduled")
  await runBackup(runId)
}
