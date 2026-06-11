import { randomUUID } from "node:crypto"
import { createReadStream, createWriteStream } from "node:fs"
import { access, appendFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises"
import { dirname, join, relative, resolve, sep } from "node:path"
import type { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type {
  MultipartPart,
  ObjectInfo,
  PutObjectInput,
  PutStreamInput,
  StorageDriver,
} from "./driver"

/** Local filesystem storage driver. Keys map to paths under a single root. */
export class FsDriver implements StorageDriver {
  readonly name = "fs"
  readonly supportsPresign = false
  private readonly root: string

  constructor(root: string) {
    this.root = resolve(root)
  }

  private resolveKey(key: string): string {
    const full = resolve(this.root, key)
    const rel = relative(this.root, full)
    if (rel.startsWith("..") || rel.startsWith(sep) || resolve(this.root, rel) !== full) {
      throw new Error(`Invalid storage key escapes root: ${key}`)
    }
    return full
  }

  async put(input: PutObjectInput): Promise<void> {
    const path = this.resolveKey(input.key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, input.body)
  }

  async putStream(input: PutStreamInput): Promise<void> {
    const path = this.resolveKey(input.key)
    await mkdir(dirname(path), { recursive: true })
    await pipeline(input.body, createWriteStream(path))
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolveKey(key))
  }

  async getStream(key: string): Promise<Readable> {
    return createReadStream(this.resolveKey(key))
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolveKey(key), { force: true })
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.resolveKey(key))
      return true
    } catch {
      return false
    }
  }

  async list(prefix: string): Promise<ObjectInfo[]> {
    const base = this.resolveKey(prefix)
    const results: ObjectInfo[] = []
    const walk = async (dir: string): Promise<void> => {
      let entries
      try {
        entries = await readdir(dir, { withFileTypes: true })
      } catch {
        return
      }
      for (const entry of entries) {
        const entryPath = join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(entryPath)
        } else {
          const info = await stat(entryPath)
          results.push({ key: relative(this.root, entryPath), size: info.size })
        }
      }
    }
    await walk(base)
    return results
  }

  private partPath(key: string, uploadId: string): string {
    return this.resolveKey(`${key}.${uploadId}.uploading`)
  }

  async createMultipart(key: string): Promise<string> {
    const uploadId = randomUUID()
    await mkdir(dirname(this.partPath(key, uploadId)), { recursive: true })
    return uploadId
  }

  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer | Uint8Array,
  ): Promise<MultipartPart> {
    await appendFile(this.partPath(key, uploadId), body)
    return { partNumber, etag: String(partNumber) }
  }

  async completeMultipart(key: string, uploadId: string): Promise<void> {
    const target = this.resolveKey(key)
    await mkdir(dirname(target), { recursive: true })
    await rename(this.partPath(key, uploadId), target)
  }

  async abortMultipart(key: string, uploadId: string): Promise<void> {
    await rm(this.partPath(key, uploadId), { force: true })
  }

  async presignGet(): Promise<string> {
    throw new Error("FsDriver does not support presigned URLs; stream via the API instead")
  }

  async presignPut(): Promise<string> {
    throw new Error("FsDriver does not support presigned URLs; upload via the API instead")
  }
}
