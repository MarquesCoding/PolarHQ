/**
 * Runtime server configuration. PolarHQ is self-hosted, so the user points the app at their own
 * server URL on the connect screen; we persist it in the device keychain (expo-secure-store) and
 * feed it into @workspace/core's config so every shared data call targets the right host.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { configureCore } from '@workspace/core/config';

const SERVER_URL_KEY = 'polarhq.serverUrl';

/**
 * The Android emulator can't reach the host via localhost (that resolves to the emulator itself);
 * 10.0.2.2 is its alias for the host loopback. Rewrite local addresses so a dev server entered as
 * "localhost:3001" works on Android too. (localhost is never a valid real-device target anyway.)
 */
const forEmulator = (url: string): string =>
  Platform.OS === 'android'
    ? url.replace(/\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/i, '//10.0.2.2')
    : url;

/** Coerce loose input ("my.server", "http://…/") into a clean origin. */
export const normalizeServerUrl = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return forEmulator(withScheme.replace(/\/+$/, ''));
};

const applyConfig = (apiUrl: string): void => {
  configureCore({
    appName: 'PolarHQ',
    apiUrl,
    appVersion: Constants.expoConfig?.version ?? '0.5.0',
    appBuild: 'mobile',
  });
};

/**
 * Synchronously load + apply the saved server URL at startup, before any session fetch fires.
 * SDK 56's SecureStore exposes a sync getter, which lets us configure core before React renders.
 */
export const bootstrapServerUrl = (): string | null => {
  const url = SecureStore.getItem(SERVER_URL_KEY);
  if (url) applyConfig(url);
  return url ?? null;
};

/** Persist + apply a new server URL (returns the normalized value actually stored). */
export const saveServerUrl = async (raw: string): Promise<string> => {
  const url = normalizeServerUrl(raw);
  await SecureStore.setItemAsync(SERVER_URL_KEY, url);
  applyConfig(url);
  return url;
};

/** Forget the server (used by "Disconnect"). */
export const clearServerUrl = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(SERVER_URL_KEY);
};
