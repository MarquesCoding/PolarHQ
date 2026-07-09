import { isStreamBlob, secretboxOpen, secretstreamOpenAll } from "./crypto"

/**
 * Decrypt large media blobs off the main thread via {@link cryptoWorker}, with a synchronous fallback.
 * The worker is a pure optimization: any failure (no Worker support, construction/decrypt error) falls
 * back to decrypting on the calling thread, so photo/video loading never depends on it.
 */
const syncDecrypt = (blob: Uint8Array, key: Uint8Array): Uint8Array =>
  isStreamBlob(blob) ? secretstreamOpenAll(blob, key) : secretboxOpen(blob, key)

interface Pending {
  resolve: (plain: Uint8Array) => void
  reject: (error: unknown) => void
}

let worker: Worker | null = null
let disabled = false
let nextId = 1
const pending = new Map<number, Pending>()

const getWorker = (): Worker | null => {
  if (disabled) return null
  if (worker) return worker
  if (typeof Worker === "undefined") {
    disabled = true
    return null
  }
  try {
    const created = new Worker(new URL("./cryptoWorker.ts", import.meta.url), { type: "module" })
    created.onmessage = (event: MessageEvent<{ id: number; ok: boolean; buffer?: ArrayBuffer }>) => {
      const { id, ok, buffer } = event.data
      const entry = pending.get(id)
      if (!entry) return
      pending.delete(id)
      if (ok && buffer) entry.resolve(new Uint8Array(buffer))
      else entry.reject(new Error("worker decrypt failed"))
    }
    created.onerror = () => {
      disabled = true
      worker = null
      for (const entry of pending.values()) entry.reject(new Error("worker error"))
      pending.clear()
    }
    worker = created
    return worker
  } catch {
    disabled = true
    return null
  }
}

/** Decrypt a stored blob, off-thread when possible; always resolves to the plaintext (or throws only
 *  if the synchronous fallback itself throws, i.e. genuinely bad ciphertext/key). */
export const decryptBlobAsync = async (blob: Uint8Array, key: Uint8Array): Promise<Uint8Array> => {
  const active = getWorker()
  if (!active) return syncDecrypt(blob, key)
  const id = nextId++
  // Copy before transferring so `blob`/`key` stay intact for the fallback path.
  const blobCopy = blob.slice()
  const keyCopy = key.slice()
  try {
    return await new Promise<Uint8Array>((resolve, reject) => {
      pending.set(id, { resolve, reject })
      active.postMessage({ id, blob: blobCopy.buffer, key: keyCopy.buffer }, [
        blobCopy.buffer,
        keyCopy.buffer,
      ])
    })
  } catch {
    return syncDecrypt(blob, key)
  }
}
