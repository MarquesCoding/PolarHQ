"use client"

import { apiFetch } from "@polarhq/sdk/apiClient"
import {
  type DocMeta,
  type DocType,
  createDoc,
  fetchDocCollaborators,
  fetchDocContent,
  saveDocContent,
} from "./docs"
import { fingerprintOf, verifyAndPin } from "@polarhq/core/keyVerification"
import { secureStoreClear, secureStoreGet, secureStoreSet } from "@polarhq/core/secureStore"
import {
  type KdfParams,
  type Keypair,
  cryptoReady,
  defaultKdfParams,
  deriveKey,
  fromB64,
  legacyKdfParams,
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
} from "@polarhq/core/crypto"

interface KeyBundle {
  publicKey: string
  wrappedPrivateKey: string
  kdfSalt: string
  kdfParams: string | null
  recoveryWrapped: string | null
  wrappedMetaKey: string | null
}

const LEGACY_KEY = "vault.e2e.kp"
const encoder = new TextEncoder()
const decoder = new TextDecoder()

let keypair: Keypair | null = null
let metaKey: Uint8Array | null = null
const contentKeyCache = new Map<string, Uint8Array>()

const readLegacy = (): string | null => {
  try {
    return (
      (typeof localStorage !== "undefined" && localStorage.getItem(LEGACY_KEY)) ||
      (typeof sessionStorage !== "undefined" && sessionStorage.getItem(LEGACY_KEY)) ||
      null
    )
  } catch {
    return null
  }
}

const clearLegacy = () => {
  try {
    localStorage?.removeItem(LEGACY_KEY)
    sessionStorage?.removeItem(LEGACY_KEY)
  } catch {
    /* ignore */
  }
}

const restore = async () => {
  if (keypair) return
  const blob = await secureStoreGet()
  if (blob) {
    try {
      const { pk, sk, mk } = JSON.parse(decoder.decode(blob)) as {
        pk: string
        sk: string
        mk?: string
      }
      keypair = { publicKey: fromB64(pk), privateKey: fromB64(sk) }
      if (mk) metaKey = fromB64(mk)
    } catch {
      /* ignore */
    }
  }
  if (!keypair) {
    const legacy = readLegacy()
    if (legacy) {
      try {
        const { pk, sk } = JSON.parse(legacy) as { pk: string; sk: string }
        keypair = { publicKey: fromB64(pk), privateKey: fromB64(sk) }
        await persist()
      } catch {
        /* ignore */
      }
    }
  }
  clearLegacy()
}

const persist = async () => {
  if (!keypair) return
  try {
    await secureStoreSet(
      encoder.encode(
        JSON.stringify({
          pk: toB64(keypair.publicKey),
          sk: toB64(keypair.privateKey),
          mk: metaKey ? toB64(metaKey) : undefined,
        }),
      ),
    )
  } catch {
    /* ignore — unlocked for this session even if it couldn't be cached */
  }
}

/**
 * Ensure the account metadata key is loaded into memory — unsealing it from the bundle,
 * or lazily generating + enrolling one for accounts created before metadata encryption.
 */
const ensureMetaKey = async (bundle: KeyBundle): Promise<void> => {
  if (!keypair) return
  if (bundle.wrappedMetaKey) {
    try {
      metaKey = openSealed(fromB64(bundle.wrappedMetaKey), keypair)
      return
    } catch {
      /* fall through to re-enroll */
    }
  }
  const key = newContentKey()
  await apiFetch("/api/v1/docs/keys/meta", {
    method: "PUT",
    body: JSON.stringify({ wrappedMetaKey: toB64(sealTo(key, keypair.publicKey)) }),
  })
  metaKey = key
}

/** Initialize libsodium and restore the unlocked keypair, if the user has unlocked before. */
export const e2eReady = async (): Promise<void> => {
  await cryptoReady()
  await restore()
  if (keypair && !metaKey) {
    const bundle = await fetchKeyBundle().catch(() => null)
    if (bundle) {
      await ensureMetaKey(bundle)
      await persist()
    }
  }
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
  const params = defaultKdfParams()
  const recoveryKey = newRecoveryKey()
  const accountMetaKey = newContentKey()
  await apiFetch("/api/v1/docs/keys", {
    method: "POST",
    body: JSON.stringify({
      publicKey: toB64(pair.publicKey),
      wrappedPrivateKey: toB64(secretboxSeal(pair.privateKey, deriveKey(password, salt, params))),
      kdfSalt: toB64(salt),
      kdfParams: JSON.stringify(params),
      recoveryWrapped: toB64(secretboxSeal(pair.privateKey, recoveryKey)),
      wrappedMetaKey: toB64(sealTo(accountMetaKey, pair.publicKey)),
    }),
  })
  keypair = pair
  metaKey = accountMetaKey
  await persist()
  return { recoveryCode: recoveryCodeFromKey(recoveryKey) }
}

/** Unlock the private key with the account password. Returns false on a wrong password. */
export const unlockKeys = async (password: string): Promise<boolean> => {
  await cryptoReady()
  const bundle = await fetchKeyBundle()
  if (!bundle) return false
  try {
    const params = bundle.kdfParams
      ? (JSON.parse(bundle.kdfParams) as KdfParams)
      : legacyKdfParams()
    const privateKey = secretboxOpen(
      fromB64(bundle.wrappedPrivateKey),
      deriveKey(password, fromB64(bundle.kdfSalt), params),
    )
    keypair = { publicKey: fromB64(bundle.publicKey), privateKey }
    await ensureMetaKey(bundle)
    await persist()
    if (!bundle.kdfParams) void upgradeKdf(password, privateKey)
    return true
  } catch {
    return false
  }
}

/**
 * Re-wrap the private key with the current (stronger) KDF params and persist the new bundle,
 * migrating a legacy account off the old INTERACTIVE parameters. Best-effort.
 */
const upgradeKdf = async (password: string, privateKey: Uint8Array): Promise<void> => {
  try {
    const salt = newSalt()
    const params = defaultKdfParams()
    await apiFetch("/api/v1/docs/keys/kdf", {
      method: "PUT",
      body: JSON.stringify({
        wrappedPrivateKey: toB64(secretboxSeal(privateKey, deriveKey(password, salt, params))),
        kdfSalt: toB64(salt),
        kdfParams: JSON.stringify(params),
      }),
    })
  } catch {
    /* ignore — the account still unlocks with the legacy params next time */
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
    await ensureMetaKey(bundle)
    await persist()
    return true
  } catch {
    return false
  }
}

export const lockKeys = (): void => {
  keypair = null
  metaKey = null
  contentKeyCache.clear()
  void secureStoreClear()
  if (typeof localStorage !== "undefined") localStorage.removeItem(LEGACY_KEY)
}

/** A unique, non-revealing placeholder stored in the plaintext `name` of an encrypted node. */
export const encryptedPlaceholder = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? `enc-${crypto.randomUUID()}` : "encrypted"

/** Encrypt a node name with the account metadata key (null if locked / no key). */
export const encryptName = (name: string): string | null =>
  metaKey ? toB64(secretboxSeal(encoder.encode(name), metaKey)) : null

/** Decrypt a node's encrypted name, or null if locked / unreadable. */
export const decryptName = (encryptedName: string | null | undefined): string | null => {
  if (!encryptedName || !metaKey) return null
  try {
    return decoder.decode(secretboxOpen(fromB64(encryptedName), metaKey))
  } catch {
    return null
  }
}

/** Encrypt arbitrary bytes under the account metadata key (e.g. ML embeddings). Null if locked. */
export const encryptWithMetaKey = (bytes: Uint8Array): string | null =>
  metaKey ? toB64(secretboxSeal(bytes, metaKey)) : null

/** Decrypt bytes encrypted with the account metadata key, or null if locked / unreadable. */
export const decryptWithMetaKey = (b64: string): Uint8Array | null => {
  if (!metaKey) return null
  try {
    return secretboxOpen(fromB64(b64), metaKey)
  } catch {
    return null
  }
}

/** Encrypt a name with a specific content key (for shared-doc names readable by collaborators). */
export const encryptNameWith = (name: string, key: Uint8Array): string =>
  toB64(secretboxSeal(encoder.encode(name), key))

/** Decrypt a shared-doc name using the doc's content key, or null if unavailable. */
export const decryptSharedName = async (
  nodeId: string,
  sharedName: string | null | undefined,
): Promise<string | null> => {
  if (!sharedName) return null
  const key = await getDocContentKey(nodeId)
  if (!key) return null
  try {
    return decoder.decode(secretboxOpen(fromB64(sharedName), key))
  } catch {
    return null
  }
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

export type ShareKeyResult =
  | { status: "ok"; fingerprint: string }
  | { status: "no-recipient" }
  | { status: "no-key" }
  | { status: "key-changed"; fingerprint: string }

/**
 * Wrap a doc's content key to a collaborator (by email). Verifies the recipient's
 * public key against the local pin (TOFU) — refuses if it changed, so a malicious
 * server can't substitute its own key.
 */
export const shareDocKey = async (nodeId: string, email: string): Promise<ShareKeyResult> => {
  const key = await getDocContentKey(nodeId)
  if (!key) return { status: "no-key" }
  const target = await apiFetch<{ userId: string; publicKey: string }>(
    `/api/v1/docs/keys/public?email=${encodeURIComponent(email)}`,
  ).catch(() => null)
  if (!target) return { status: "no-recipient" }

  const verdict = verifyAndPin(target.userId, target.publicKey)
  if (verdict.changed) return { status: "key-changed", fingerprint: fingerprintOf(target.publicKey) }

  await apiFetch(`/api/v1/docs/documents/${nodeId}/keys`, {
    method: "POST",
    body: JSON.stringify({
      keys: [{ userId: target.userId, wrappedKey: toB64(sealTo(key, fromB64(target.publicKey))) }],
    }),
  })
  return { status: "ok", fingerprint: fingerprintOf(target.publicKey) }
}

/**
 * Rotate an encrypted doc's content key so a removed collaborator can no longer read it:
 * generate a fresh key, re-encrypt the stored snapshot under it, and re-wrap it to the
 * owner + every *remaining* collaborator. Call this after removeDocCollaborator. The old
 * key (held by the revoked user) is destroyed server-side by the rotate endpoint.
 */
export const rekeyDoc = async (nodeId: string, selfUserId: string): Promise<void> => {
  if (!keypair) throw new Error("locked")
  const oldKey = await getDocContentKey(nodeId)
  if (!oldKey) return
  const newKey = newContentKey()

  const content = new Uint8Array(await fetchDocContent(nodeId))
  if (content.byteLength) {
    const plain = secretboxOpen(content, oldKey)
    await saveDocContent(nodeId, secretboxSeal(plain, newKey))
  }

  const entries = [{ userId: selfUserId, wrappedKey: toB64(sealTo(newKey, keypair.publicKey)) }]
  for (const collab of await fetchDocCollaborators(nodeId)) {
    const target = await apiFetch<{ userId: string; publicKey: string }>(
      `/api/v1/docs/keys/public?email=${encodeURIComponent(collab.email)}`,
    ).catch(() => null)
    if (!target) continue
    if (verifyAndPin(target.userId, target.publicKey).changed) continue
    entries.push({
      userId: target.userId,
      wrappedKey: toB64(sealTo(newKey, fromB64(target.publicKey))),
    })
  }

  await apiFetch(`/api/v1/docs/documents/${nodeId}/keys/rotate`, {
    method: "POST",
    body: JSON.stringify({ keys: entries }),
  })
  contentKeyCache.set(nodeId, newKey)
}
