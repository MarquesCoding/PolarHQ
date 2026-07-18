import { cryptoReady, isStreamBlob, secretboxOpen, secretstreamOpenAll } from "./crypto"

/**
 * Off-main-thread decrypt worker. Receives a stored blob + its symmetric key, decrypts (secretbox or
 * secretstream, detected from the blob), and transfers the plaintext buffer back — keeping multi-MB
 * media decrypts off the render thread. The main thread falls back to synchronous decrypt if this
 * worker is unavailable or errors (see cryptoWorkerClient), so correctness never depends on it.
 */
interface DecryptRequest {
  id: number
  blob: ArrayBuffer
  key: ArrayBuffer
}

self.onmessage = async (event: MessageEvent<DecryptRequest>) => {
  const { id, blob, key } = event.data
  const post = (message: unknown, transfer?: Transferable[]) =>
    (self as unknown as Worker).postMessage(message, transfer ?? [])
  try {
    await cryptoReady()
    const bytes = new Uint8Array(blob)
    const plain = isStreamBlob(bytes)
      ? secretstreamOpenAll(bytes, new Uint8Array(key))
      : secretboxOpen(bytes, new Uint8Array(key))
    const buffer = plain.buffer.slice(
      plain.byteOffset,
      plain.byteOffset + plain.byteLength,
    ) as ArrayBuffer
    post({ id, ok: true, buffer }, [buffer])
  } catch {
    post({ id, ok: false })
  }
}
