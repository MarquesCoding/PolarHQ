import { config } from "@workspace/config"
import type { StorageDriver } from "./driver"
import { FsDriver } from "./fs-driver"
import { S3Driver } from "./s3-driver"

export type { ObjectInfo, PutObjectInput, StorageDriver } from "./driver"
export { FsDriver } from "./fs-driver"
export { S3Driver, type S3DriverOptions } from "./s3-driver"
export { assetObjectKeys, type AssetObjectKeys } from "./keys"

/** Build a storage driver from the validated environment configuration. */
export const createStorage = (): StorageDriver => {
  if (config.storage.driver === "fs") {
    return new FsDriver(config.storage.fsRoot)
  }

  const { s3 } = config.storage
  if (!s3.accessKeyId || !s3.secretAccessKey) {
    throw new Error("S3 credentials are required for the s3 storage driver")
  }

  return new S3Driver({
    bucket: s3.bucket,
    region: s3.region,
    endpoint: s3.endpoint,
    accessKeyId: s3.accessKeyId,
    secretAccessKey: s3.secretAccessKey,
    forcePathStyle: s3.forcePathStyle,
  })
}

let singleton: StorageDriver | undefined

/** Shared process-wide storage driver instance. */
export const storage = (): StorageDriver => {
  singleton ??= createStorage()
  return singleton
}
