/**
 * Desktop backing for @workspace/core's unlocked-keypair cache. The default web backend keeps the
 * blob in the Tauri webview's IndexedDB, which doesn't reliably survive an app relaunch (WKWebView /
 * WebView2 can evict it), so the app re-prompted for the encryption password on every launch. Here
 * we persist the small (~250 byte) blob to a file in the app's private data directory via the Tauri
 * store — the same durable storage the server URL uses — so unlocking once sticks across restarts.
 */
import type { Store } from "@tauri-apps/plugin-store"
import type { SecureStoreBackend } from "@workspace/core/secureStore"

const STORE_FILE = "secure.json"
const BLOB_KEY = "keypair"

let storePromise: Promise<Store> | null = null

const tauriStore = async (): Promise<Store> => {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then((mod) =>
      mod.load(STORE_FILE, { autoSave: true, defaults: {} }),
    )
  }
  return storePromise
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = ""
  for (const b of bytes) binary += String.fromCharCode(b)
  return globalThis.btoa(binary)
}

const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(globalThis.atob(value), (c) => c.charCodeAt(0))

export const tauriSecureStoreBackend: SecureStoreBackend = {
  async get() {
    try {
      const store = await tauriStore()
      const stored = await store.get<string>(BLOB_KEY)
      return stored ? fromBase64(stored) : null
    } catch {
      return null
    }
  },
  async set(data) {
    const store = await tauriStore()
    await store.set(BLOB_KEY, toBase64(data))
    await store.save()
  },
  async clear() {
    try {
      const store = await tauriStore()
      await store.delete(BLOB_KEY)
      await store.save()
    } catch {
      /* nothing to clear */
    }
  },
}
