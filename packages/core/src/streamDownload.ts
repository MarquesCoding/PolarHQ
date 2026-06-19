"use client"

import {
  type StreamOpener,
  isStreamBlob,
  secretstreamOpenInit,
  streamCipherChunkSize,
  streamPrefixSize,
} from "./crypto"
import type { UploadProgress } from "./xhrUpload"

interface SaveWritable {
  write: (data: Uint8Array) => Promise<void>
  close: () => Promise<void>
  abort?: (reason?: unknown) => Promise<void>
}

interface SaveCapableWindow {
  showSaveFilePicker?: (options?: {
    suggestedName?: string
  }) => Promise<{ createWritable: () => Promise<SaveWritable> }>
}

const saveCapable = (): SaveCapableWindow => window as unknown as SaveCapableWindow

/** Whether this browser can stream a download straight to disk (File System Access API). */
export const supportsStreamingDownload = (): boolean =>
  typeof saveCapable().showSaveFilePicker === "function"

/**
 * Stream-download a streaming-format (secretstream) blob from `url` straight to disk, decrypting
 * chunk-by-chunk so the browser never holds the whole plaintext in memory. Returns `true` when it
 * handled the download (including a user-cancelled save dialog), `false` to fall back to the
 * in-memory path (unsupported browser, fetch error, or a legacy secretbox blob), and throws on a
 * mid-stream failure (the partial file is discarded).
 */
export const streamDecryptToDisk = async (
  url: string,
  key: Uint8Array,
  suggestedName: string,
  fallbackTotal: number,
  onProgress?: (progress: UploadProgress) => void,
): Promise<boolean> => {
  if (!supportsStreamingDownload()) return false

  let writable: SaveWritable
  try {
    const handle = await saveCapable().showSaveFilePicker!({ suggestedName })
    writable = await handle.createWritable()
  } catch {
    return true
  }

  try {
    const response = await fetch(url, { credentials: "include" })
    if (!response.ok || !response.body) {
      await writable.abort?.()
      return false
    }
    const total = Number(response.headers.get("content-length")) || fallbackTotal || 0
    let loaded = 0
    const startTime = performance.now()
    const reader = response.body.getReader()
    const prefixSize = streamPrefixSize()
    const cipherChunk = streamCipherChunkSize()
    const pending: Uint8Array[] = []
    let pendingLen = 0
    const take = (count: number): Uint8Array => {
      const out = new Uint8Array(count)
      let filled = 0
      while (filled < count) {
        const head = pending[0]!
        const need = count - filled
        if (head.length <= need) {
          out.set(head, filled)
          filled += head.length
          pending.shift()
        } else {
          out.set(head.subarray(0, need), filled)
          filled += need
          pending[0] = head.subarray(need)
        }
      }
      pendingLen -= count
      return out
    }

    let opener: StreamOpener | null = null
    let done = false
    for (;;) {
      const { value, done: streamDone } = await reader.read()
      if (value) {
        pending.push(value)
        pendingLen += value.length
        loaded += value.length
        const elapsed = (performance.now() - startTime) / 1000
        onProgress?.({ loaded, total, speed: elapsed > 0 ? loaded / elapsed : 0 })
      }
      if (!opener && pendingLen >= prefixSize) {
        const prefix = take(prefixSize)
        if (!isStreamBlob(prefix)) {
          await writable.abort?.()
          return false
        }
        opener = secretstreamOpenInit(prefix, key)
      }
      while (opener && !done && (pendingLen >= cipherChunk || (streamDone && pendingLen > 0))) {
        const size = Math.min(cipherChunk, pendingLen)
        if (size < cipherChunk && !streamDone) break
        const { message, final } = opener.open(take(size))
        await writable.write(message)
        if (final) done = true
      }
      if (streamDone || done) break
    }
    await writable.close()
    return true
  } catch (error) {
    await writable.abort?.().catch(() => undefined)
    throw error
  }
}
