/**
 * Persists the better-auth bearer token to the desktop's on-disk store, so a relaunch stays signed
 * in. The desktop talks cross-origin to a remote server where the SameSite session cookie can't be
 * used, so bearer auth is how it stays authenticated (see @workspace/core/authToken).
 */
import type { Store } from "@tauri-apps/plugin-store"

const STORE_FILE = "settings.json"
const KEY = "authToken"

let storePromise: Promise<Store> | null = null

const tauriStore = async (): Promise<Store> => {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then((mod) =>
      mod.load(STORE_FILE, { autoSave: true, defaults: {} }),
    )
  }
  return storePromise
}

export const loadAuthToken = async (): Promise<string | null> => {
  try {
    const store = await tauriStore()
    return (await store.get<string>(KEY)) ?? null
  } catch {
    return null
  }
}

export const saveAuthToken = async (token: string | null): Promise<void> => {
  try {
    const store = await tauriStore()
    if (token) await store.set(KEY, token)
    else await store.delete(KEY)
    await store.save()
  } catch {
    /* best-effort; the session still works for this run */
  }
}
