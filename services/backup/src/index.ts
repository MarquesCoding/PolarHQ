import {
  type BackupJob,
  JOB_BACKUP_TICK,
  QUEUE_BACKUP,
  createRedisConnection,
  scheduleBackupTick,
} from "@workspace/jobs"
import { Worker } from "bullmq"
import { runBackup, runScheduledIfDue } from "./runner"

const connection = createRedisConnection()

const worker = new Worker<BackupJob>(
  QUEUE_BACKUP,
  async (job) => {
    if (job.name === JOB_BACKUP_TICK) {
      await runScheduledIfDue()
      return
    }
    if (job.data.runId) await runBackup(job.data.runId)
  },
  { connection, concurrency: 1 },
)

worker.on("failed", (job, error) => {
  console.error(`✗ backup: job ${job?.id} failed`, error)
})

await scheduleBackupTick()

console.log("backup worker started, listening on queue:", QUEUE_BACKUP)
