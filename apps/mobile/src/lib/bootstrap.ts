/**
 * One-time wiring of the shared @workspace/core data layer for React Native: point its keypair
 * cache at the keychain, and attach the better-auth session cookie to every API call (RN has no
 * shared cookie jar, so cookie-based `credentials: "include"` alone doesn't authenticate).
 */
import { configureApiAuth } from '@workspace/core/apiClient';
import { configureSecureStore } from '@workspace/core/secureStore';

import { authClient } from '@/lib/auth';
import '@/lib/background-sync';
import { expoSecureStoreBackend } from '@/lib/secureStore';

let booted = false;

export const bootstrapCore = (): void => {
  if (booted) return;
  booted = true;

  configureSecureStore(expoSecureStoreBackend);

  configureApiAuth(() => {
    const cookie = authClient.getCookie();
    return cookie ? { Cookie: cookie } : undefined;
  });
};
