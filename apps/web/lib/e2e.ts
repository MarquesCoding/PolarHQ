"use client"

import { apiFetch } from "@lib/apiClient"
import { type DocMeta, type DocType, createDoc } from "@lib/docs"
import {
  type Keypair,
  cryptoReady,
  deriveKey,
  fromB64,
  generateKeypair,
  newContentKey,
  newRecoveryKey,
  newSalt,
  openSealed,
  recoveryCodeFromKey,
  recoveryKeyFromCode,
  sealTo,
  secretboxOpen,
  secretboxSeal,
  toB64,
} from "@lib/crypto"

interface KeyBundle {
  publicKey: string
  wrappedPrivateKey: string
  kdfSalt: string
  recoveryWrapped: string | null
}

// Persisted (localStorage) so the keypair stays unlocked across refreshes, tabs, and
// split-view iframes once you sign in — cleared only on sign-out (see lockKeys).
const STORE_KEY = "orbit.e2e.kp"

let keypair: Keypair | null = null
const contentKeyCache = new Map<string, Uint8Array>()

const restore = () => {
  if (keypair || typeof localStorage === "undefined") return
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return
    const { pk, sk } = JSON.parse(raw) as { pk: string; sk: string }
    keypair = { publicKey: fromB64(pk), privateKey: fromB64(sk) }
  } catch {
    /* ignore */
  }
}

const persist = () => {
  if (!keypair || typeof localStorage === "undefined") return
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({ pk: toB64(keypair.publicKey), sk: toB64(keypair.privateKey) }),
  )
}

/** Initialize libsodium and restore the unlocked keypair, if the user has unlocked before. */
export const e2eReady = async (): Promise<void> => {
  await cryptoReady()
  restore()
}

export const isUnlocked = (): boolean => keypair !== null

let unlockPrompted = false
/** Whether the app should prompt to unlock/set up keys (locked, and not yet prompted this load). */
export const shouldPromptUnlock = (): boolean => !isUnlocked() && !unlockPrompted
export const markUnlockPrompted = (): void => {
  unlockPrompted = true
}

export const fetchKeyBundle = (): Promise<KeyBundle | null> =>
  apiFetch<{ keys: KeyBundle | null }>("/api/v1/docs/keys/me").then((r) => r.keys)

/** Whether the user has ever set up encryption (server holds their key bundle). */
export const isEnrolled = async (): Promise<boolean> => Boolean(await fetchKeyBundle())

/** First-time setup: generate a keypair, wrap it with the password + a recovery key. */
export const setupKeys = async (password: string): Promise<{ recoveryCode: string }> => {
  await cryptoReady()
  const pair = generateKeypair()
  const salt = newSalt()
  const recoveryKey = newRecoveryKey()
  await apiFetch("/api/v1/docs/keys", {
    method: "POST",
    body: JSON.stringify({
      publicKey: toB64(pair.publicKey),
      wrappedPrivateKey: toB64(secretboxSeal(pair.privateKey, deriveKey(password, salt))),
      kdfSalt: toB64(salt),
      recoveryWrapped: toB64(secretboxSeal(pair.privateKey, recoveryKey)),
    }),
  })
  keypair = pair
  persist()
  return { recoveryCode: recoveryCodeFromKey(recoveryKey) }
}

/** Unlock the private key with the account password. Returns false on a wrong password. */
export const unlockKeys = async (password: string): Promise<boolean> => {
  await cryptoReady()
  const bundle = await fetchKeyBundle()
  if (!bundle) return false
  try {
    const privateKey = secretboxOpen(
      fromB64(bundle.wrappedPrivateKey),
      deriveKey(password, fromB64(bundle.kdfSalt)),
    )
    keypair = { publicKey: fromB64(bundle.publicKey), privateKey }
    persist()
    return true
  } catch {
    return false
  }
}

/** Unlock using the recovery code (when the password is lost). */
export const unlockWithRecovery = async (code: string): Promise<boolean> => {
  await cryptoReady()
  const bundle = await fetchKeyBundle()
  if (!bundle?.recoveryWrapped) return false
  try {
    const privateKey = secretboxOpen(fromB64(bundle.recoveryWrapped), recoveryKeyFromCode(code))
    keypair = { publicKey: fromB64(bundle.publicKey), privateKey }
    persist()
    return true
  } catch {
    return false
  }
}

export const lockKeys = (): void => {
  keypair = null
  contentKeyCache.clear()
  if (typeof localStorage !== "undefined") localStorage.removeItem(STORE_KEY)
}

/** The wrapped content key the server holds for this user/doc (null if plaintext or no access). */
const fetchWrappedDocKey = (nodeId: string): Promise<string | null> =>
  apiFetch<{ wrappedKey: string | null }>(`/api/v1/docs/documents/${nodeId}/key`).then(
    (r) => r.wrappedKey,
  )

/** Whether a document is encrypted (a wrapped content key exists for it). */
export const isDocEncrypted = async (nodeId: string): Promise<boolean> =>
  Boolean(await fetchWrappedDocKey(nodeId))

/** The decrypted symmetric content key for a doc, or null if plaintext / undecryptable. */
export const getDocContentKey = async (nodeId: string): Promise<Uint8Array | null> => {
  const cached = contentKeyCache.get(nodeId)
  if (cached) return cached
  const wrapped = await fetchWrappedDocKey(nodeId)
  if (!wrapped || !keypair) return null
  try {
    const key = openSealed(fromB64(wrapped), keypair)
    contentKeyCache.set(nodeId, key)
    return key
  } catch {
    return null
  }
}

/** Generate a content key for a doc and store it wrapped to the owner. Returns the key. */
export const enableDocEncryption = async (nodeId: string): Promise<Uint8Array> => {
  if (!keypair) throw new Error("locked")
  const key = newContentKey()
  await apiFetch(`/api/v1/docs/documents/${nodeId}/self-key`, {
    method: "POST",
    body: JSON.stringify({ wrappedKey: toB64(sealTo(key, keypair.publicKey)) }),
  })
  contentKeyCache.set(nodeId, key)
  return key
}

/**
 * Create a document, encrypted by default: a new doc whose content key is generated
 * and stored wrapped to the owner. Falls back to a plaintext doc only if encryption
 * keys aren't available (e.g. the user never signed in this session).
 */
export const createEncryptedDoc = async (
  parentId?: string | null,
  type: DocType = "doc",
): Promise<DocMeta> => {
  const doc = await createDoc(parentId, undefined, type)
  await e2eReady()
  if (isUnlocked()) {
    try {
      await enableDocEncryption(doc.id)
    } catch {
      /* leave plaintext if key storage fails */
    }
  }
  return doc
}

/** A fresh content key (not yet stored) — used to encrypt before the node exists (uploads). */
export const createContentKey = (): Uint8Array => newContentKey()

/** Store an already-generated content key wrapped to the owner, for a node id. */
export const storeContentKey = async (nodeId: string, key: Uint8Array): Promise<void> => {
  if (!keypair) throw new Error("locked")
  await apiFetch(`/api/v1/docs/documents/${nodeId}/self-key`, {
    method: "POST",
    body: JSON.stringify({ wrappedKey: toB64(sealTo(key, keypair.publicKey)) }),
  })
  contentKeyCache.set(nodeId, key)
}

/** Wrap a doc's content key to a collaborator (by email). False if they have no keys yet. */
export const shareDocKey = async (nodeId: string, email: string): Promise<boolean> => {
  const key = await getDocContentKey(nodeId)
  if (!key) return false
  const target = await apiFetch<{ userId: string; publicKey: string }>(
    `/api/v1/docs/keys/public?email=${encodeURIComponent(email)}`,
  ).catch(() => null)
  if (!target) return false
  await apiFetch(`/api/v1/docs/documents/${nodeId}/keys`, {
    method: "POST",
    body: JSON.stringify({
      keys: [{ userId: target.userId, wrappedKey: toB64(sealTo(key, fromB64(target.publicKey))) }],
    }),
  })
  return true
}
