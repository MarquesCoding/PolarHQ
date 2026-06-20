import type { Store } from "@tauri-apps/plugin-store"

const STORE_FILE = "settings.json"
const STORE_KEY = "serverUrl"
const LAST_KEY = "lastServerUrl"
const LOCAL_KEY = "polarhq.serverUrl"
const LOCAL_LAST = "polarhq.lastServerUrl"

/** True when running inside the Tauri runtime (vs. plain browser `pnpm dev`). */
const inTauri = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window

let storePromise: Promise<Store> | null = null

/** Lazily open the on-disk settings store (dynamic import keeps the plugin out of browser builds). */
const tauriStore = async (): Promise<Store> => {
  if (!storePromise) {
    storePromise = import("@tauri-apps/plugin-store").then((mod) =>
      mod.load(STORE_FILE, { autoSave: true, defaults: {} }),
    )
  }
  return storePromise
}

/** The configured server origin, or `null` on first run. Reads the durable store under Tauri,
 *  falling back to `localStorage` in the browser. */
export const loadServerUrl = async (): Promise<string | null> => {
  if (inTauri()) {
    try {
      const store = await tauriStore()
      return (await store.get<string>(STORE_KEY)) ?? null
    } catch {
      return null
    }
  }
  try {
    return localStorage.getItem(LOCAL_KEY)
  } catch {
    return null
  }
}

/** The last server the user connected to — kept even after {@link clearServerUrl}, so the connect
 *  screen can pre-fill it for returning users. */
export const loadLastServerUrl = async (): Promise<string | null> => {
  if (inTauri()) {
    try {
      const store = await tauriStore()
      return (await store.get<string>(LAST_KEY)) ?? null
    } catch {
      return null
    }
  }
  try {
    return localStorage.getItem(LOCAL_LAST)
  } catch {
    return null
  }
}

/** Persist the chosen server origin to disk (Tauri) or `localStorage` (browser), and remember it as
 *  the last-used server for pre-filling later. */
export const saveServerUrl = async (url: string): Promise<void> => {
  if (inTauri()) {
    try {
      const store = await tauriStore()
      await store.set(STORE_KEY, url)
      await store.set(LAST_KEY, url)
      await store.save()
      return
    } catch {
      /* fall through to localStorage */
    }
  }
  try {
    localStorage.setItem(LOCAL_KEY, url)
    localStorage.setItem(LOCAL_LAST, url)
  } catch {
    /* storage unavailable — the session stays connected in memory only */
  }
}

/** Forget the stored server, returning the app to the connect screen on next boot. */
export const clearServerUrl = async (): Promise<void> => {
  if (inTauri()) {
    try {
      const store = await tauriStore()
      await store.delete(STORE_KEY)
      await store.save()
    } catch {
      /* nothing to clear */
    }
  }
  try {
    localStorage.removeItem(LOCAL_KEY)
  } catch {
    /* nothing to clear */
  }
}

/** Turn a user-typed host into a clean origin: default to https when no scheme, drop trailing slashes. */
export const normalizeServerUrl = (raw: string): string => {
  const trimmed = raw.trim()
  if (!trimmed) return ""
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return withScheme.replace(/\/+$/, "")
}

/** Probe `${url}/health`. Resolves to the server's app name on success; throws if it's unreachable
 *  or isn't a PolarHQ server. */
export const probeServer = async (url: string): Promise<string> => {
  const response = await fetch(`${url}/health`, { method: "GET" })
  if (!response.ok) throw new Error(`Server responded ${response.status}`)
  const data = (await response.json()) as { ok?: boolean; app?: string }
  if (!data.ok) throw new Error("Not a PolarHQ server")
  return data.app ?? "PolarHQ"
}
