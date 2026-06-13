"use client"

import {
  cryptoReady,
  deriveKey,
  fromB64,
  newSalt,
  secretboxOpen,
  secretboxSeal,
  toB64,
} from "@polarhq/core/crypto"
import { fetchFolderLock, removeFolderLockApi, setFolderLockApi } from "./drive"

const VERIFIER_PLAINTEXT = new TextEncoder().encode("vault-folder-lock-v1")
const unlocked = new Set<string>()

export const isFolderUnlocked = (id: string): boolean => unlocked.has(id)

export const lockFolderSession = (id: string): void => {
  unlocked.delete(id)
}

/** Lock a folder with a password: a verifier is stored, and the locker holds it open this session. */
export const lockFolder = async (id: string, password: string): Promise<void> => {
  await cryptoReady()
  const salt = newSalt()
  const verifier = secretboxSeal(VERIFIER_PLAINTEXT, deriveKey(password, salt))
  await setFolderLockApi(id, toB64(salt), toB64(verifier))
  unlocked.add(id)
}

/** Verify the folder password and, if correct, unlock it for this session. */
export const unlockFolder = async (id: string, password: string): Promise<boolean> => {
  await cryptoReady()
  try {
    const { salt, verifier } = await fetchFolderLock(id)
    secretboxOpen(fromB64(verifier), deriveKey(password, fromB64(salt)))
    unlocked.add(id)
    return true
  } catch {
    return false
  }
}

/** Remove a folder's lock (after the password has been verified). */
export const removeFolderLock = async (id: string): Promise<void> => {
  await removeFolderLockApi(id)
  unlocked.delete(id)
}
