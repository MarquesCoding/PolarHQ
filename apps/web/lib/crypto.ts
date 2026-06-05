import sodium from "libsodium-wrappers-sumo"

/**
 * Client-side cryptography for E2E documents (libsodium). The server only ever
 * stores the ciphertext/wrapped values produced here — never keys or plaintext.
 */

let readyPromise: Promise<void> | null = null

/** Resolve once libsodium's WASM is initialized. Call before any other function. */
export const cryptoReady = (): Promise<void> => {
  readyPromise ??= sodium.ready
  return readyPromise
}

const B64 = () => sodium.base64_variants.ORIGINAL

export const toB64 = (bytes: Uint8Array): string => sodium.to_base64(bytes, B64())
export const fromB64 = (value: string): Uint8Array => sodium.from_base64(value, B64())

export interface Keypair {
  publicKey: Uint8Array
  privateKey: Uint8Array
}

export const generateKeypair = (): Keypair => {
  const pair = sodium.crypto_box_keypair()
  return { publicKey: pair.publicKey, privateKey: pair.privateKey }
}

export const newSalt = (): Uint8Array => sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES)

/** Derive a 32-byte key-encryption-key from a password + salt (Argon2id). */
export const deriveKey = (password: string, salt: Uint8Array): Uint8Array =>
  sodium.crypto_pwhash(
    32,
    password,
    salt,
    sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sodium.crypto_pwhash_ALG_ARGON2ID13,
  )

/** Symmetric-encrypt with a 32-byte key, returning nonce‖ciphertext. */
export const secretboxSeal = (message: Uint8Array, key: Uint8Array): Uint8Array => {
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES)
  const cipher = sodium.crypto_secretbox_easy(message, nonce, key)
  const out = new Uint8Array(nonce.length + cipher.length)
  out.set(nonce)
  out.set(cipher, nonce.length)
  return out
}

/** Symmetric-decrypt a nonce‖ciphertext blob. Throws if the key is wrong. */
export const secretboxOpen = (blob: Uint8Array, key: Uint8Array): Uint8Array => {
  const n = sodium.crypto_secretbox_NONCEBYTES
  return sodium.crypto_secretbox_open_easy(blob.slice(n), blob.slice(0, n), key)
}

/** Anonymous public-key encryption (sealed box) — wrap a key to a recipient's public key. */
export const sealTo = (message: Uint8Array, recipientPublicKey: Uint8Array): Uint8Array =>
  sodium.crypto_box_seal(message, recipientPublicKey)

export const openSealed = (sealed: Uint8Array, keypair: Keypair): Uint8Array =>
  sodium.crypto_box_seal_open(sealed, keypair.publicKey, keypair.privateKey)

/** A fresh random symmetric content key for a document. */
export const newContentKey = (): Uint8Array => sodium.crypto_secretbox_keygen()

/** A random recovery key (a second way to unwrap the private key if the password is lost). */
export const newRecoveryKey = (): Uint8Array => sodium.randombytes_buf(32)

/** Human-presentable recovery code: the recovery key as base64, grouped for readability. */
export const recoveryCodeFromKey = (key: Uint8Array): string =>
  (toB64(key).match(/.{1,8}/g) ?? []).join("-")

export const recoveryKeyFromCode = (code: string): Uint8Array =>
  fromB64(code.replace(/-/g, "").trim())
