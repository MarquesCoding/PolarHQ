import { resolveLimit } from "@workspace/auth"
import type { Context } from "hono"

const PIECE_BYTES = 64 * 1024

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * A TransformStream that paces throughput to roughly `bytesPerSec`. Awaiting between pieces
 * stops the stream pulling from its source, so back-pressure reaches the socket and caps how
 * fast the client can upload.
 */
export const throttleStream = (bytesPerSec: number): TransformStream<Uint8Array, Uint8Array> =>
  new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      for (let offset = 0; offset < chunk.length; offset += PIECE_BYTES) {
        const piece = chunk.subarray(offset, offset + PIECE_BYTES)
        controller.enqueue(piece)
        await sleep((piece.length / bytesPerSec) * 1000)
      }
    },
  })

const MULTIPART_OVERHEAD = 1024 * 1024

const numericLimit = (value: unknown): number | null =>
  typeof value === "number" && value > 0 ? value : null

const formatBytes = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB", "TB"]
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

/**
 * Parse a multipart upload while enforcing the user's resolved limits (user > group > instance):
 * `upload.rateBytesPerSec` paces the inbound body so the client's upload speed is capped, and
 * `upload.maxFileBytes` rejects oversized files — coarsely up front via Content-Length (so a huge
 * body is never buffered) and precisely after parse via the file's real size. Returns a `413`
 * `Response` when too large; otherwise the parsed `FormData`.
 */
export const readUploadForm = async (c: Context, userId: string): Promise<FormData | Response> => {
  const [rateValue, maxValue] = await Promise.all([
    resolveLimit(userId, "upload.rateBytesPerSec"),
    resolveLimit(userId, "upload.maxFileBytes"),
  ])
  const rate = numericLimit(rateValue)
  const maxBytes = numericLimit(maxValue)

  if (maxBytes !== null) {
    const contentLength = Number(c.req.header("content-length") ?? "")
    if (Number.isFinite(contentLength) && contentLength > maxBytes + MULTIPART_OVERHEAD) {
      return c.json({ error: `File exceeds the ${formatBytes(maxBytes)} upload limit` }, 413)
    }
  }

  const body = c.req.raw.body
  const form =
    body && rate !== null
      ? await new Request(c.req.raw.url, {
          method: "POST",
          headers: c.req.raw.headers,
          body: body.pipeThrough(throttleStream(rate)),
          duplex: "half",
        } as RequestInit & { duplex: "half" }).formData()
      : await c.req.raw.formData()

  if (maxBytes !== null) {
    const file = form.get("file")
    if (file instanceof File && file.size > maxBytes) {
      return c.json({ error: `File exceeds the ${formatBytes(maxBytes)} upload limit` }, 413)
    }
  }

  return form
}
