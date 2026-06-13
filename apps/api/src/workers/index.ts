import {
  type BackupJob,
  JOB_BACKUP_TICK,
  type ProcessAssetJob,
  QUEUE_BACKUP,
  QUEUE_MEDIA,
  createRedisConnection,
  scheduleBackupTick,
} from "@polarhq/jobs"
import { type Job, Worker } from "bullmq"
import { runBackup, runScheduledIfDue } from "./backup/runner"
import { processAsset } from "./media/processor"

/**
 * Start the background queue consumers in-process with the API. For a self-hosted
 * single-box deployment this means one Node process runs everything; set
 * RUN_WORKERS=false to disable and run dedicated worker processes instead (the
 * scale path). Returns the workers so the caller can close them on shutdown.
 */
export const startWorkers = async (): Promise<Worker[]> => {
  const connection = createRedisConnection()

  const media = new Worker<ProcessAssetJob>(
    QUEUE_MEDIA,
    async (job) => {
      await processAsset(job.data.assetId)
    },
    { connection, concurrency: 4 },
  )
  media.on("completed", (job: Job<ProcessAssetJob>) => {
    console.log(`✓ media: processed asset ${job.data.assetId}`)
  })
  media.on("failed", (job: Job<ProcessAssetJob> | undefined, error: Error) => {
    console.error(`✗ media: failed asset ${job?.data.assetId}`, error)
  })

  const backup = new Worker<BackupJob>(
    QUEUE_BACKUP,
    async (job: Job<BackupJob>) => {
      if (job.name === JOB_BACKUP_TICK) {
        await runScheduledIfDue()
        return
      }
      if (job.data.runId) await runBackup(job.data.runId)
    },
    { connection, concurrency: 1 },
  )
  backup.on("failed", (job: Job<BackupJob> | undefined, error: Error) => {
    console.error(`✗ backup: job ${job?.id} failed`, error)
  })

  await scheduleBackupTick()

  console.log(`workers started in-process (media:${QUEUE_MEDIA}, backup:${QUEUE_BACKUP})`)
  return [media, backup]
}
