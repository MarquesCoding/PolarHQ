import type { Readable } from "node:stream"
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import type {
  MultipartPart,
  ObjectInfo,
  PutObjectInput,
  PutStreamInput,
  StorageDriver,
} from "./driver"

export interface S3DriverOptions {
  bucket: string
  region: string
  endpoint?: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle?: boolean
}

/** S3-compatible storage driver (MinIO by default; any S3/B2/R2 endpoint). */
export class S3Driver implements StorageDriver {
  readonly name = "s3"
  readonly supportsPresign = true
  private readonly client: S3Client
  private readonly bucket: string

  constructor(options: S3DriverOptions) {
    this.bucket = options.bucket
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle ?? true,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
    })
  }

  async put(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    )
  }

  async putStream(input: PutStreamInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentLength: input.contentLength,
        ContentType: input.contentType,
      }),
    )
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )
    if (!response.Body) throw new Error(`Empty object body for key: ${key}`)
    const bytes = await response.Body.transformToByteArray()
    return Buffer.from(bytes)
  }

  async getStream(key: string): Promise<Readable> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )
    if (!response.Body) throw new Error(`Empty object body for key: ${key}`)
    return response.Body as Readable
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }

  async list(prefix: string): Promise<ObjectInfo[]> {
    const objects: ObjectInfo[] = []
    let token: string | undefined
    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: token,
        }),
      )
      for (const item of response.Contents ?? []) {
        objects.push({ key: item.Key ?? "", size: item.Size ?? 0 })
      }
      token = response.IsTruncated ? response.NextContinuationToken : undefined
    } while (token)
    return objects
  }

  async presignGet(key: string, expiresInSeconds = 3600): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    })
  }

  async presignPut(key: string, expiresInSeconds = 3600, contentType?: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: expiresInSeconds },
    )
  }

  async createMultipart(key: string, contentType?: string): Promise<string> {
    const response = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
    )
    if (!response.UploadId) throw new Error("S3 did not return an UploadId")
    return response.UploadId
  }

  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer | Uint8Array,
  ): Promise<MultipartPart> {
    const response = await this.client.send(
      new UploadPartCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: body,
      }),
    )
    if (!response.ETag) throw new Error("S3 did not return an ETag for the part")
    return { partNumber, etag: response.ETag }
  }

  async completeMultipart(key: string, uploadId: string, parts: MultipartPart[]): Promise<void> {
    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: [...parts]
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((part) => ({ PartNumber: part.partNumber, ETag: part.etag })),
        },
      }),
    )
  }

  async abortMultipart(key: string, uploadId: string): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId }),
    )
  }
}
