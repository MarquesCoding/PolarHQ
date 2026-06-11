import { createRedisConnection } from "@workspace/jobs"
import type { MultipartPart } from "@workspace/storage"

/** A resumable chunked-upload session, held in Redis while the parts stream in. */
export interface UploadSession {
  ownerId: string
  parentId: string
  filename: string
  mimeType: string
  encryptedName: string | null
  storageKey: string
  multipartUploadId: string
  parts: MultipartPart[]
  bytes: number
}

const redis = createRedisConnection()
const TTL_SECONDS = 60 * 60 * 24
const sessionKey = (id: string): string => `drive:upload:${id}`

export const saveUploadSession = async (id: string, session: UploadSession): Promise<void> => {
  await redis.set(sessionKey(id), JSON.stringify(session), "EX", TTL_SECONDS)
}

export const getUploadSession = async (id: string): Promise<UploadSession | null> => {
  const raw = await redis.get(sessionKey(id))
  return raw ? (JSON.parse(raw) as UploadSession) : null
}

export const deleteUploadSession = async (id: string): Promise<void> => {
  await redis.del(sessionKey(id))
}
