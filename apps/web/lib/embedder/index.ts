"use client"

import { MODEL_VERSION } from "./clipWorker"

export { MODEL_VERSION }

/**
 * Client handle to the CLIP worker. The model (tens of MB) downloads + runs in the browser,
 * so embeddings are computed without the original ever leaving the device. The worker is
 * created lazily on first use and reused.
 */

interface Pending {
  resolve: (vector: Float32Array) => void
  reject: (error: Error) => void
}

let worker: Worker | null = null
let nextId = 0
const pending = new Map<number, Pending>()

const getWorker = (): Worker => {
  if (worker) return worker
  worker = new Worker(new URL("./clipWorker.ts", import.meta.url), { type: "module" })
  worker.onmessage = (event: MessageEvent) => {
    const { id, ok, vector, error } = event.data as {
      id: number
      ok: boolean
      vector?: number[]
      error?: string
    }
    const p = pending.get(id)
    if (!p) return
    pending.delete(id)
    if (ok && vector) p.resolve(Float32Array.from(vector))
    else p.reject(new Error(error ?? "embed failed"))
  }
  worker.onerror = () => {
    for (const [, p] of pending) p.reject(new Error("embedder worker crashed"))
    pending.clear()
  }
  return worker
}

const request = (message: { type: string; blob?: Blob; text?: string }): Promise<Float32Array> => {
  const id = nextId++
  return new Promise<Float32Array>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, ...message })
  })
}

/** Whether the browser can run the embedder (Workers + the APIs transformers.js needs). */
export const embedderSupported = (): boolean =>
  typeof Worker !== "undefined" && typeof createImageBitmap !== "undefined"

/** Warm up the model so the first real embed isn't cold. */
export const warmupEmbedder = (): Promise<unknown> => request({ type: "warmup" }).catch(() => null)

/** Embed an image (its decrypted bytes) into a unit-length CLIP vector. */
export const embedImage = (blob: Blob): Promise<Float32Array> =>
  request({ type: "embed-image", blob })

/** Embed a text query into the same CLIP space. */
export const embedText = (text: string): Promise<Float32Array> => request({ type: "embed-text", text })

/** Cosine similarity of two unit-length vectors (a dot product). */
export const cosine = (a: Float32Array, b: Float32Array): number => {
  let sum = 0
  const n = Math.min(a.length, b.length)
  for (let i = 0; i < n; i += 1) sum += a[i]! * b[i]!
  return sum
}
