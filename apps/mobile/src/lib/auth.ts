/**
 * better-auth client for React Native. Mirrors @workspace/core/authClient (a placeholder origin
 * rewritten to the runtime-configured server) but adds the Expo plugin so the session cookie is
 * persisted in the device keychain and replayed on every request — RN has no browser cookie jar.
 */
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { coreConfig } from '@workspace/core/config';

const PLACEHOLDER_ORIGIN = 'http://polar.invalid';

const dynamicFetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const apiUrl = coreConfig().apiUrl;
  if (input instanceof Request) {
    return fetch(new Request(input.url.replace(PLACEHOLDER_ORIGIN, apiUrl), input));
  }
  return fetch(String(input).replace(PLACEHOLDER_ORIGIN, apiUrl), init);
};

export const authClient = createAuthClient({
  baseURL: PLACEHOLDER_ORIGIN,
  fetchOptions: { customFetchImpl: dynamicFetch },
  plugins: [
    expoClient({
      scheme: 'polarhq',
      storagePrefix: 'polarhq',
      storage: SecureStore,
    }),
  ],
});
