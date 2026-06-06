import { Queue } from "bullmq"
import { createRedisConnection } from "./connection"

export const QUEUE_MEDIA = "media"
export const JOB_PROCESS_ASSET = "process-asset"

/** Payload for processing a freshly-uploaded asset (EXIF + thumbnails). */
export interface ProcessAssetJob {
  assetId: string
}

const connection = createRedisConnection()

export const mediaQueue = new Queue<ProcessAssetJob>(QUEUE_MEDIA, { connection })

export const enqueueProcessAsset = async (data: ProcessAssetJob): Promise<void> => {
  await mediaQueue.add(JOB_PROCESS_ASSET, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  })
}

export const QUEUE_BACKUP = "backup"
export const JOB_RUN_BACKUP = "run-backup"
export const JOB_BACKUP_TICK = "backup-tick"

/** Payload for a backup job: a specific run to execute, or empty for the scheduler tick. */
export interface BackupJob {
  runId?: string
}

export const backupQueue = new Queue<BackupJob>(QUEUE_BACKUP, { connection })

/** Enqueue execution of an already-created backup run. */
export const enqueueBackupRun = async (runId: string): Promise<void> => {
  await backupQueue.add(
    JOB_RUN_BACKUP,
    { runId },
    { attempts: 1, removeOnComplete: { count: 50 }, removeOnFail: { count: 50 } },
  )
}

/** Register the hourly repeatable tick that runs a scheduled backup when one is due. */
export const scheduleBackupTick = async (): Promise<void> => {
  await backupQueue.add(
    JOB_BACKUP_TICK,
    {},
    {
      jobId: "backup-tick",
      repeat: { every: 60 * 60 * 1000 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  )
}
