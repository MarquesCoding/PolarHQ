import { QUEUE_MEDIA, createRedisConnection, type ProcessAssetJob } from "@workspace/jobs"
import { Worker } from "bullmq"
import { processAsset } from "./processor"

const connection = createRedisConnection()

const worker = new Worker<ProcessAssetJob>(
  QUEUE_MEDIA,
  async (job) => {
    await processAsset(job.data.assetId)
  },
  { connection, concurrency: 4 },
)

worker.on("completed", (job) => {
  console.log(`✓ media: processed asset ${job.data.assetId}`)
})

worker.on("failed", (job, error) => {
  console.error(`✗ media: failed asset ${job?.data.assetId}`, error)
})

console.log("media worker started, listening on queue:", QUEUE_MEDIA)
