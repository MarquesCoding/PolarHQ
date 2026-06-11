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

export interface KdfParams {
  ops: number
  mem: number
}

/**
 * Default Argon2id work factors: MODERATE iterations with 128 MiB memory — stronger
 * than the INTERACTIVE preset against offline brute-force, while staying within
 * what a browser tab (incl. mobile) can allocate. Stored with the key bundle so the
 * cost can be raised later without breaking existing accounts.
 */
export const defaultKdfParams = (): KdfParams => ({
  ops: sodium.crypto_pwhash_OPSLIMIT_MODERATE,
  mem: 128 * 1024 * 1024,
})

/**
 * The Argon2id parameters used before KDF params were versioned (#60). Accounts enrolled
 * then have no stored params, so their key was wrapped with these — unlock MUST derive with
 * the same values or it produces the wrong key (a spurious "incorrect password").
 */
export const legacyKdfParams = (): KdfParams => ({
  ops: sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
  mem: sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
})

/** Derive a 32-byte key-encryption-key from a password + salt (Argon2id). */
export const deriveKey = (
  password: string,
  salt: Uint8Array,
  params: KdfParams = defaultKdfParams(),
): Uint8Array =>
  sodium.crypto_pwhash(
    32,
    password,
    salt,
    params.ops,
    params.mem,
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

/**
 * Streaming (secretstream) encryption for large files, so we never hold the whole plaintext or
 * ciphertext in memory. The stored blob is `STREAM_MAGIC ‖ header(24) ‖ chunk0 ‖ chunk1 ‖ …`, where
 * every chunk encrypts exactly `STREAM_CHUNK_SIZE` plaintext bytes (the last may be shorter), so the
 * reader can frame chunks by size without explicit length prefixes. The 4-byte magic distinguishes
 * this format from a legacy secretbox blob on read.
 */
export const STREAM_CHUNK_SIZE = 8 * 1024 * 1024

export const STREAM_OVERHEAD = (): number =>
  sodium.crypto_secretstream_xchacha20poly1305_ABYTES

const STREAM_MAGIC = Uint8Array.from([0x50, 0x53, 0x53, 0x31])

export interface StreamSealer {
  /** `STREAM_MAGIC ‖ header` — the first bytes to store, before any sealed chunk. */
  prefix: Uint8Array
  /** Encrypt the next plaintext chunk; pass `final: true` for the last one. */
  seal: (chunk: Uint8Array, final: boolean) => Uint8Array
}

export const secretstreamInit = (key: Uint8Array): StreamSealer => {
  const { state, header } = sodium.crypto_secretstream_xchacha20poly1305_init_push(key)
  const prefix = new Uint8Array(STREAM_MAGIC.length + header.length)
  prefix.set(STREAM_MAGIC)
  prefix.set(header, STREAM_MAGIC.length)
  return {
    prefix,
    seal: (chunk, final) =>
      sodium.crypto_secretstream_xchacha20poly1305_push(
        state,
        chunk,
        null,
        final
          ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
          : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE,
      ),
  }
}

/** Whether a stored blob is the streaming format (vs a legacy secretbox blob). */
export const isStreamBlob = (blob: Uint8Array): boolean =>
  blob.length >= STREAM_MAGIC.length && STREAM_MAGIC.every((byte, i) => blob[i] === byte)

/** Bytes of `STREAM_MAGIC ‖ header` at the start of a streaming blob. */
export const streamPrefixSize = (): number =>
  STREAM_MAGIC.length + sodium.crypto_secretstream_xchacha20poly1305_HEADERBYTES

/** Size of one stored (encrypted) chunk: plaintext chunk + the AEAD tag. */
export const streamCipherChunkSize = (): number =>
  STREAM_CHUNK_SIZE + sodium.crypto_secretstream_xchacha20poly1305_ABYTES

export interface StreamOpener {
  open: (cipher: Uint8Array) => { message: Uint8Array; final: boolean }
}

/** Begin incremental decryption from a streaming blob's prefix (`STREAM_MAGIC ‖ header`). */
export const secretstreamOpenInit = (prefix: Uint8Array, key: Uint8Array): StreamOpener => {
  const header = prefix.slice(STREAM_MAGIC.length, streamPrefixSize())
  const state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, key)
  return {
    open: (cipher) => {
      const result = sodium.crypto_secretstream_xchacha20poly1305_pull(state, cipher, null)
      if (!result) throw new Error("stream decrypt failed")
      return {
        message: result.message,
        final: result.tag === sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL,
      }
    },
  }
}

/** Decrypt a whole streaming blob into plaintext (whole-buffer; use the streaming reader for big files). */
export const secretstreamOpenAll = (blob: Uint8Array, key: Uint8Array): Uint8Array => {
  const opener = secretstreamOpenInit(blob.slice(0, streamPrefixSize()), key)
  const cipherChunk = streamCipherChunkSize()
  const parts: Uint8Array[] = []
  let offset = streamPrefixSize()
  while (offset < blob.length) {
    const end = Math.min(offset + cipherChunk, blob.length)
    const { message, final } = opener.open(blob.slice(offset, end))
    parts.push(message)
    offset = end
    if (final) break
  }
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let cursor = 0
  for (const part of parts) {
    out.set(part, cursor)
    cursor += part.length
  }
  return out
}

/** Anonymous public-key encryption (sealed box) — wrap a key to a recipient's public key. */
export const sealTo = (message: Uint8Array, recipientPublicKey: Uint8Array): Uint8Array =>
  sodium.crypto_box_seal(message, recipientPublicKey)

export const openSealed = (sealed: Uint8Array, keypair: Keypair): Uint8Array =>
  sodium.crypto_box_seal_open(sealed, keypair.publicKey, keypair.privateKey)

/** A short, human-comparable fingerprint of a public key (for out-of-band verification). */
export const fingerprint = (publicKey: Uint8Array): string =>
  (sodium.to_hex(sodium.crypto_generichash(8, publicKey, null)).toUpperCase().match(/.{4}/g) ?? [])
    .join("-")

/** A fresh random symmetric content key for a document. */
export const newContentKey = (): Uint8Array => sodium.crypto_secretbox_keygen()

/** A random recovery key (a second way to unwrap the private key if the password is lost). */
export const newRecoveryKey = (): Uint8Array => sodium.randombytes_buf(32)

/** Human-presentable recovery code: the recovery key as base64, grouped for readability. */
export const recoveryCodeFromKey = (key: Uint8Array): string =>
  (toB64(key).match(/.{1,8}/g) ?? []).join("-")

export const recoveryKeyFromCode = (code: string): Uint8Array =>
  fromB64(code.replace(/-/g, "").trim())
