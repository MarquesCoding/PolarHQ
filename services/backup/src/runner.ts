import { config, decryptSecret } from "@workspace/config"
import { db, schema } from "@workspace/db"
import { S3Driver, storage } from "@workspace/storage"
import { eq } from "drizzle-orm"
import { createDriveFolder, getAccessToken, uploadDriveFile } from "./gdrive"

const SINGLETON = "singleton"

type BackupSettings = typeof schema.backupSettings.$inferSelect

const getSettings = async (): Promise<BackupSettings | null> => {
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

const streamToBuffer = async (stream: AsyncIterable<Uint8Array>): Promise<Buffer> => {
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
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

interface BackupResult {
  objectCount: number
  bytes: number
}

/** Copy every object from primary storage to the configured S3 destination. */
const runS3Backup = async (settings: BackupSettings): Promise<BackupResult> => {
  if (!settings.bucket || !settings.region || !settings.accessKeyId || !settings.secretAccessKey) {
    throw new Error("S3 backup destination is not configured")
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
  const objects = await source.list("")
  let objectCount = 0
  let bytes = 0
  for (const object of objects) {
    const body = await source.getStream(object.key)
    await destination.putStream({ key: `${prefix}${object.key}`, body, contentLength: object.size })
    objectCount += 1
    bytes += object.size
  }
  return { objectCount, bytes }
}

/** Upload every object from primary storage into a fresh timestamped Google Drive folder. */
const runGDriveBackup = async (settings: BackupSettings): Promise<BackupResult> => {
  const { clientId, clientSecret } = config.google
  if (!clientId || !clientSecret) {
    throw new Error(
      "Google client credentials are not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)",
    )
  }
  if (!settings.gdriveRefreshToken) throw new Error("Google Drive is not connected")

  const refresh = () =>
    getAccessToken(clientId, clientSecret, decryptSecret(settings.gdriveRefreshToken!))
  let accessToken = await refresh()
  const folderName = `PolarHQ Backup ${new Date().toISOString().replace(/[:.]/g, "-")}`
  const folderId = await createDriveFolder(accessToken, folderName, settings.gdriveFolderId)

  const source = storage()
  const objects = await source.list("")
  let objectCount = 0
  let bytes = 0
  for (const object of objects) {
    if (objectCount > 0 && objectCount % 200 === 0) accessToken = await refresh()
    const buffer = await streamToBuffer(await source.getStream(object.key))
    await uploadDriveFile(accessToken, object.key.replace(/\//g, "_"), folderId, buffer)
    objectCount += 1
    bytes += object.size
  }
  return { objectCount, bytes }
}

/**
 * Run a backup to the configured destination, recording the outcome on the given run row.
 * On any error the whole run is marked failed (a partial copy is left in place).
 */
export const runBackup = async (runId: string): Promise<void> => {
  const settings = await getSettings()
  const markFailed = (message: string) =>
    db
      .update(schema.backupRuns)
      .set({ status: "failed", error: message, finishedAt: new Date() })
      .where(eq(schema.backupRuns.id, runId))

  if (!settings) {
    await markFailed("Backup destination is not configured")
    return
  }

  try {
    const result =
      settings.provider === "gdrive" ? await runGDriveBackup(settings) : await runS3Backup(settings)
    await db
      .update(schema.backupRuns)
      .set({
        status: "completed",
        objectCount: result.objectCount,
        bytes: result.bytes,
        finishedAt: new Date(),
      })
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
  if (!settings?.enabled) return
  if (settings.provider === "gdrive" ? !settings.gdriveRefreshToken : !settings.bucket) return
  const dueAfterMs = settings.frequencyHours * 60 * 60 * 1000
  if (settings.lastRunAt && Date.now() - settings.lastRunAt.getTime() < dueAfterMs) return
  const runId = await startRun("scheduled")
  await runBackup(runId)
}
