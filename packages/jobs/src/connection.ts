import { config } from "@workspace/config"
import { Redis } from "ioredis"

/**
 * Create a new Redis connection. BullMQ requires `maxRetriesPerRequest: null`,
 * and each Worker/QueueEvents/subscriber needs its own connection. An `error`
 * listener is attached so a dropped connection reconnects instead of throwing
 * an unhandled error that crashes the process.
 */
export const createRedisConnection = (): Redis => {
  const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: null })
  redis.on("error", (error) => {
    console.error(`[redis] connection error: ${error.message}`)
  })
  return redis
}
