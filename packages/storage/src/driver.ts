import type { Readable } from "node:stream"

export interface PutObjectInput {
  key: string
  body: Buffer | Uint8Array
  contentType?: string
}

export interface PutStreamInput {
  key: string
  body: Readable
  /** Required for S3 to stream without buffering the whole object in memory. */
  contentLength?: number
  contentType?: string
}

export interface ObjectInfo {
  key: string
  size: number
}

/**
 * Pluggable object-storage backend. Implementations: filesystem (`FsDriver`)
 * and any S3-compatible service (`S3Driver`, default MinIO). Apps depend on
 * this interface only, never a concrete driver.
 */
export interface StorageDriver {
  readonly name: string
  readonly supportsPresign: boolean

  put(input: PutObjectInput): Promise<void>
  putStream(input: PutStreamInput): Promise<void>
  get(key: string): Promise<Buffer>
  getStream(key: string): Promise<Readable>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  list(prefix: string): Promise<ObjectInfo[]>

  presignGet(key: string, expiresInSeconds?: number): Promise<string>
  presignPut(key: string, expiresInSeconds?: number, contentType?: string): Promise<string>
}
