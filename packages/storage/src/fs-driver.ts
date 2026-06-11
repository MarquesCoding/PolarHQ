import { randomUUID } from "node:crypto"
import { once } from "node:events"
import { createReadStream, createWriteStream } from "node:fs"
import { access, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises"
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

  private partsDir(key: string, uploadId: string): string {
    return this.resolveKey(`${key}.${uploadId}.parts`)
  }

  async createMultipart(key: string): Promise<string> {
    const uploadId = randomUUID()
    await mkdir(this.partsDir(key, uploadId), { recursive: true })
    return uploadId
  }

  /** Each part is its own file (named by part number), so a re-uploaded part overwrites rather
   *  than duplicating — making retries idempotent. */
  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    body: Buffer | Uint8Array,
  ): Promise<MultipartPart> {
    await writeFile(join(this.partsDir(key, uploadId), String(partNumber)), body)
    return { partNumber, etag: String(partNumber) }
  }

  /** Concatenate the parts in order into the final object, deleting each part as it is written so
   *  peak disk stays ~1× the file size, then atomically rename into place. */
  async completeMultipart(key: string, uploadId: string, parts: MultipartPart[]): Promise<void> {
    const partsDir = this.partsDir(key, uploadId)
    const target = this.resolveKey(key)
    const tmp = `${target}.assembling`
    await mkdir(dirname(target), { recursive: true })
    const out = createWriteStream(tmp)
    const finished = once(out, "finish")
    for (const part of [...parts].sort((a, b) => a.partNumber - b.partNumber)) {
      const partFile = join(partsDir, String(part.partNumber))
      const data = await readFile(partFile)
      if (!out.write(data)) await once(out, "drain")
      await rm(partFile, { force: true })
    }
    out.end()
    await finished
    await rename(tmp, target)
    await rm(partsDir, { recursive: true, force: true })
  }

  async abortMultipart(key: string, uploadId: string): Promise<void> {
    await rm(this.partsDir(key, uploadId), { recursive: true, force: true })
  }

  async presignGet(): Promise<string> {
    throw new Error("FsDriver does not support presigned URLs; stream via the API instead")
  }

  async presignPut(): Promise<string> {
    throw new Error("FsDriver does not support presigned URLs; upload via the API instead")
  }
}
