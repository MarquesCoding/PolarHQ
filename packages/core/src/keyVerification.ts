"use client"

import { fingerprint, fromB64 } from "./crypto"

/**
 * Trust-on-first-use pinning for collaborators' public keys. The first time you share
 * with someone, their key is pinned locally; if a (malicious) server later hands back a
 * different key, we refuse rather than wrap the content key to an attacker. Public keys
 * aren't secret, so the pins live in localStorage.
 */

const PIN_KEY = "orbit.e2e.pins"

const loadPins = (): Record<string, string> => {
  if (typeof localStorage === "undefined") return {}
  try {
    return JSON.parse(localStorage.getItem(PIN_KEY) ?? "{}") as Record<string, string>
  } catch {
    return {}
  }
}

const savePins = (pins: Record<string, string>) => {
  if (typeof localStorage !== "undefined") localStorage.setItem(PIN_KEY, JSON.stringify(pins))
}

export interface PinVerdict {
  /** True if the key differs from a previously-pinned one — a possible MITM. */
  changed: boolean
  firstUse: boolean
}

/** Verify a public key against the local pin (pinning it on first use). */
export const verifyAndPin = (userId: string, publicKeyB64: string): PinVerdict => {
  const pins = loadPins()
  const existing = pins[userId]
  if (!existing) {
    pins[userId] = publicKeyB64
    savePins(pins)
    return { changed: false, firstUse: true }
  }
  if (existing === publicKeyB64) return { changed: false, firstUse: false }
  return { changed: true, firstUse: false }
}

/** The displayable fingerprint of a base64 public key. */
export const fingerprintOf = (publicKeyB64: string): string => fingerprint(fromB64(publicKeyB64))
