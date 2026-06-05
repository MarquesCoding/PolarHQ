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
