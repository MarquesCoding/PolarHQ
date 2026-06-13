import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { config } from "@polarhq/config"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { StorageDriver } from "./driver"
import { FsDriver } from "./fs-driver"
import { S3Driver } from "./s3-driver"

const sample = Buffer.from("hello vault storage")

const driverContract = (
  name: string,
  setup: () => Promise<{ driver: StorageDriver; cleanup?: () => Promise<void> }>,
) => {
  describe(name, () => {
    let driver: StorageDriver
    let cleanup: (() => Promise<void>) | undefined
    const key = `test/contract/object-${name}.txt`

    beforeAll(async () => {
      const result = await setup()
      driver = result.driver
      cleanup = result.cleanup
    })

    afterAll(async () => {
      await driver.delete(key).catch(() => undefined)
      await cleanup?.()
    })

    it("stores and reads an object", async () => {
      await driver.put({ key, body: sample, contentType: "text/plain" })
      const got = await driver.get(key)
      expect(got.toString()).toBe(sample.toString())
    })

    it("reports existence", async () => {
      expect(await driver.exists(key)).toBe(true)
      expect(await driver.exists("test/contract/missing.txt")).toBe(false)
    })

    it("lists by prefix", async () => {
      const items = await driver.list("test/contract/")
      expect(items.some((item) => item.key === key)).toBe(true)
    })

    it("deletes an object", async () => {
      await driver.delete(key)
      expect(await driver.exists(key)).toBe(false)
    })
  })
}

driverContract("FsDriver", async () => {
  const dir = await mkdtemp(join(tmpdir(), "vault-storage-"))
  return {
    driver: new FsDriver(dir),
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true })
    },
  }
})

driverContract("S3Driver", async () => {
  const { s3 } = config.storage
  return {
    driver: new S3Driver({
      bucket: s3.bucket,
      region: s3.region,
      endpoint: s3.endpoint,
      accessKeyId: s3.accessKeyId!,
      secretAccessKey: s3.secretAccessKey!,
      forcePathStyle: s3.forcePathStyle,
    }),
  }
})

describe("S3Driver presigning", () => {
  const { s3 } = config.storage
  const driver = new S3Driver({
    bucket: s3.bucket,
    region: s3.region,
    endpoint: s3.endpoint,
    accessKeyId: s3.accessKeyId!,
    secretAccessKey: s3.secretAccessKey!,
    forcePathStyle: s3.forcePathStyle,
  })
  const key = "test/presign/object.txt"

  afterAll(async () => {
    await driver.delete(key).catch(() => undefined)
  })

  it("returns a presigned GET url", async () => {
    await driver.put({ key, body: sample })
    const url = await driver.presignGet(key, 60)
    expect(url).toContain(key)
    expect(url).toContain("X-Amz-Signature")
  })
})
