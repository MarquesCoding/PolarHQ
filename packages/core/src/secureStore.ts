/**
 * At-rest cache for the unlocked keypair, so the app doesn't prompt for the password on every page
 * load. The keypair blob is AES-GCM encrypted with a wrap key kept in IndexedDB as **raw bytes**.
 *
 * We deliberately do NOT store a non-extractable `CryptoKey` object here: persisting one makes
 * WebKit/Safari (and the Tauri webview) protect it with an OS keychain master key, which can become
 * inaccessible — and then the cached keypair can't be decrypted, so the app re-prompts to unlock on
 * **every refresh** (the bug this fixes). Raw bytes always persist. The trade-off is that the wrap key
 * is extractable from IndexedDB, so this local cache is only as strong as the browser's storage
 * isolation — but the keypair stays fully password-protected server-side; this merely avoids
 * re-entering the password each session.
 */

const DB_NAME = "orbit-secure"
const STORE = "kv"
const WRAP_KEY = "wrap-key" // legacy non-extractable CryptoKey entry — cleared, never written
const WRAP_KEY_RAW = "wrap-key-raw"
const BLOB_KEY = "kp-blob"

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const idbGet = async <T>(key: string): Promise<T | undefined> => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
  })
}

const idbSet = async (key: string, value: unknown): Promise<void> => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const idbDel = async (key: string): Promise<void> => {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const getWrapKey = async (): Promise<CryptoKey> => {
  // Raw key bytes, imported to a (non-extractable in-memory) AES-GCM key. Stored as bytes so it
  // always persists, independent of any browser/OS keychain — see the module comment.
  const existing = await idbGet<Uint8Array>(WRAP_KEY_RAW)
  const raw = existing ?? crypto.getRandomValues(new Uint8Array(32))
  if (!existing) await idbSet(WRAP_KEY_RAW, raw)
  return crypto.subtle.importKey("raw", raw as BufferSource, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ])
}

/** Encrypt and persist the keypair blob. */
const webSecureStoreSet = async (data: Uint8Array): Promise<void> => {
  const key = await getWrapKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data as BufferSource),
  )
  const out = new Uint8Array(iv.length + cipher.length)
  out.set(iv)
  out.set(cipher, iv.length)
  await idbSet(BLOB_KEY, out)
}

/** Decrypt the persisted keypair blob, or null if absent/undecryptable. */
const webSecureStoreGet = async (): Promise<Uint8Array | null> => {
  const blob = await idbGet<Uint8Array>(BLOB_KEY)
  if (!blob) return null
  try {
    const key = await getWrapKey()
    const iv = blob.slice(0, 12)
    const cipher = blob.slice(12)
    return new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher as BufferSource),
    )
  } catch {
    return null
  }
}

/** Wipe the stored blob and the wrapping key (on sign-out / lock). */
const webSecureStoreClear = async (): Promise<void> => {
  await idbDel(BLOB_KEY).catch(() => undefined)
  await idbDel(WRAP_KEY).catch(() => undefined)
  await idbDel(WRAP_KEY_RAW).catch(() => undefined)
}

/**
 * Where the unlocked-keypair cache lives. The web/desktop shells use the default IndexedDB-backed
 * implementation above; a shell with no IndexedDB/WebCrypto (React Native) injects its own backend
 * (e.g. expo-secure-store) via {@link configureSecureStore} at startup.
 */
export interface SecureStoreBackend {
  get(): Promise<Uint8Array | null>
  set(data: Uint8Array): Promise<void>
  clear(): Promise<void>
}

let backend: SecureStoreBackend | null = null

/** Override the at-rest keypair cache (call once at startup before any unlock). */
export const configureSecureStore = (impl: SecureStoreBackend): void => {
  backend = impl
}

export const secureStoreSet = (data: Uint8Array): Promise<void> =>
  backend ? backend.set(data) : webSecureStoreSet(data)

export const secureStoreGet = (): Promise<Uint8Array | null> =>
  backend ? backend.get() : webSecureStoreGet()

export const secureStoreClear = (): Promise<void> =>
  backend ? backend.clear() : webSecureStoreClear()
