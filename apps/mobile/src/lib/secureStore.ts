/**
 * React Native backing for @workspace/core's unlocked-keypair cache. The web shell uses
 * IndexedDB + WebCrypto (absent on RN); here we persist the small (~250 byte) blob in the device
 * keychain via expo-secure-store, which is already hardware-encrypted at rest.
 */
import * as SecureStore from 'expo-secure-store';
import type { SecureStoreBackend } from '@workspace/core/secureStore';

const KEY = 'polarhq.keypair';

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return globalThis.btoa(binary);
};

const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(globalThis.atob(value), (c) => c.charCodeAt(0));

export const expoSecureStoreBackend: SecureStoreBackend = {
  async get() {
    const stored = await SecureStore.getItemAsync(KEY);
    return stored ? fromBase64(stored) : null;
  },
  async set(data) {
    await SecureStore.setItemAsync(KEY, toBase64(data));
  },
  async clear() {
    await SecureStore.deleteItemAsync(KEY);
  },
};
