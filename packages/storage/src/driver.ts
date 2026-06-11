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

export interface MultipartPart {
  /** 1-indexed; parts are uploaded in order for the FS driver. */
  partNumber: number
  /** Opaque tag returned by `uploadPart`, passed back to `completeMultipart`. */
  etag: string
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

  /** Begin a resumable multipart upload; returns an opaque upload id. */
  createMultipart(key: string, contentType?: string): Promise<string>
  /** Upload one part (1-indexed; in order for FS); returns its etag for completion. */
  uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer | Uint8Array,
  ): Promise<MultipartPart>
  /** Assemble the final object from its uploaded parts. */
  completeMultipart(key: string, uploadId: string, parts: MultipartPart[]): Promise<void>
  /** Discard an in-progress multipart upload and its temporary data. */
  abortMultipart(key: string, uploadId: string): Promise<void>
}
