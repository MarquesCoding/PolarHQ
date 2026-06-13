"use client"

import { apiFetch } from "./apiClient"
import { STREAM_CHUNK_SIZE, type StreamSealer } from "@polarhq/core/crypto"
import { type UploadOptions, retryOnTransient } from "./xhrUpload"

const concatBytes = (a: Uint8Array, b: Uint8Array): Uint8Array => {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

/** How many encrypted parts of a single file may be in flight at once. The browser's per-host
 *  connection limit bounds the real number; this lets one large file saturate the link instead of
 *  trickling through a single request. */
const PART_CONCURRENCY = 4

/**
 * Seal a file in STREAM_CHUNK_SIZE chunks (sequential — secretstream is stateful) and upload the
 * parts with bounded concurrency. The server assembles parts by number, so they may arrive out of
 * order; the first part carries the magic+header prefix. `partUrl(n)` returns the 1-indexed part
 * endpoint path. Throws (after the in-flight parts settle) on the first non-recoverable failure.
 */
export const uploadStreamingParts = async (
  source: File,
  sealer: StreamSealer,
  partUrl: (partNumber: number) => string,
  options?: UploadOptions,
): Promise<void> => {
  const chunks = Math.max(1, Math.ceil(source.size / STREAM_CHUNK_SIZE))
  const start = performance.now()
  let sent = 0
  let failure: unknown = null
  const inFlight = new Set<Promise<unknown>>()

  const report = (bytes: number) => {
    sent += bytes
    const elapsed = (performance.now() - start) / 1000
    options?.onProgress?.({
      loaded: sent,
      total: source.size,
      speed: elapsed > 0 ? sent / elapsed : 0,
    })
  }

  for (let index = 0; index < chunks && !failure; index += 1) {
    while (inFlight.size >= PART_CONCURRENCY && !failure) await Promise.race([...inFlight])
    if (failure) break

    const offset = index * STREAM_CHUNK_SIZE
    const slice = source.slice(offset, Math.min(offset + STREAM_CHUNK_SIZE, source.size))
    const plain = new Uint8Array(await slice.arrayBuffer())
    const sealed = sealer.seal(plain, index === chunks - 1)
    const body = (index === 0 ? concatBytes(sealer.prefix, sealed) : sealed) as BodyInit
    const sliceSize = slice.size

    const task = retryOnTransient(() =>
      apiFetch(partUrl(index + 1), {
        method: "POST",
        body,
        headers: { "content-type": "application/octet-stream" },
      }),
    )
      .then(() => report(sliceSize))
      .catch((error) => {
        failure ??= error
      })
      .finally(() => inFlight.delete(task))
    inFlight.add(task)
  }

  await Promise.all(inFlight)
  if (failure) throw failure
}
