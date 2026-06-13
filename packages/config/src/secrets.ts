import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto"
import { config } from "./index"

const ENVELOPE = "v1"

const derizeKey = (): Buffer => scryptSync(config.auth.secret, "vault.secret.v1", 32)

/**
 * Encrypt a secret string for storage at rest with AES-256-GCM, keyed by `AUTH_SECRET`. The
 * envelope is `v1.<iv>.<tag>.<ciphertext>` (all base64), so ciphertext is self-describing.
 */
export const encryptSecret = (plaintext: string): string => {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", derizeKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    ENVELOPE,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".")
}

/** Decrypt a stored secret. Values not in the `v1` envelope are returned verbatim (legacy plaintext). */
export const decryptSecret = (stored: string): string => {
  if (!stored.startsWith(`${ENVELOPE}.`)) return stored
  const [, ivB64, tagB64, ciphertextB64] = stored.split(".")
  if (!ivB64 || !tagB64 || !ciphertextB64) return stored
  try {
    const decipher = createDecipheriv("aes-256-gcm", derizeKey(), Buffer.from(ivB64, "base64"))
    decipher.setAuthTag(Buffer.from(tagB64, "base64"))
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, "base64")),
      decipher.final(),
    ]).toString("utf8")
  } catch {
    return stored
  }
}
