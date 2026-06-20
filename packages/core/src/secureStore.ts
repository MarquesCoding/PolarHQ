/**
 * At-rest protection for the unlocked keypair. The blob is encrypted with a
 * **non-extractable** WebCrypto AES-GCM key kept in IndexedDB — so a dump of
 * storage (backup, stolen disk, extension reading localStorage) is useless
 * without the key, and the key's raw bytes can never be exported.
 */

const DB_NAME = "orbit-secure"
const STORE = "kv"
const WRAP_KEY = "wrap-key"
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
  const existing = await idbGet<CryptoKey>(WRAP_KEY)
  if (existing) return existing
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ])
  await idbSet(WRAP_KEY, key)
  return key
}

/** Encrypt and persist the keypair blob. */
export const secureStoreSet = async (data: Uint8Array): Promise<void> => {
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
export const secureStoreGet = async (): Promise<Uint8Array | null> => {
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
export const secureStoreClear = async (): Promise<void> => {
  await idbDel(BLOB_KEY).catch(() => undefined)
  await idbDel(WRAP_KEY).catch(() => undefined)
}
