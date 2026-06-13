import { createRedisConnection } from "@polarhq/jobs"
import type { MultipartPart } from "@polarhq/storage"

/** A resumable chunked Photos-asset upload, held in Redis while the encrypted parts stream in. */
export interface PhotoUploadSession {
  ownerId: string
  assetId: string
  storageKey: string
  multipartUploadId: string
  parts: MultipartPart[]
  bytes: number
  mimeType: string
  type: "image" | "video" | "audio"
  width: number | null
  height: number | null
  durationMs: number | null
  encryptedName: string | null
  encryptedLocation: string | null
  encryptedExif: string | null
  placeholderName: string
  takenAtMs: number | null
}

const redis = createRedisConnection()
const TTL_SECONDS = 60 * 60 * 24
const sessionKey = (id: string): string => `photos:upload:${id}`

export const savePhotoUploadSession = async (
  id: string,
  session: PhotoUploadSession,
): Promise<void> => {
  await redis.set(sessionKey(id), JSON.stringify(session), "EX", TTL_SECONDS)
}

export const getPhotoUploadSession = async (id: string): Promise<PhotoUploadSession | null> => {
  const raw = await redis.get(sessionKey(id))
  return raw ? (JSON.parse(raw) as PhotoUploadSession) : null
}

export const deletePhotoUploadSession = async (id: string): Promise<void> => {
  await redis.del(sessionKey(id))
}
