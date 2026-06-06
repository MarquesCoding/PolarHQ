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

/**
 * Parse a multipart upload, throttled to the user's resolved `upload.rateBytesPerSec` limit when
 * one is set (user override > group > instance default). With no limit the body is parsed at full
 * speed. Reading the body slowly is what enforces the cap — it back-pressures the connection.
 */
export const readUploadForm = async (c: Context, userId: string): Promise<FormData> => {
  const rate = await resolveLimit(userId, "upload.rateBytesPerSec")
  const body = c.req.raw.body
  if (!body || typeof rate !== "number" || rate <= 0) return c.req.raw.formData()
  const request = new Request(c.req.raw.url, {
    method: "POST",
    headers: c.req.raw.headers,
    body: body.pipeThrough(throttleStream(rate)),
    duplex: "half",
  } as RequestInit & { duplex: "half" })
  return request.formData()
}
