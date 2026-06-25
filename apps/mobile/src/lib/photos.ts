/**
 * RN photo helpers. The shared `fetchAssets` (an authenticated apiFetch) is reused as-is, but the
 * web thumbnail helper returns a `blob:` object URL via `URL.createObjectURL` (unsupported by RN's
 * <Image>) and uses raw cookie fetch. Here we authenticate the raw media fetch with the better-auth
 * cookie and return a `data:` URI that expo-image can render, reusing core's crypto for decryption.
 */
import { coreConfig } from '@workspace/core/config';
import { isStreamBlob, secretboxOpen, secretstreamOpenAll } from '@workspace/core/crypto';
import { getDocContentKey } from '@workspace/core/e2e';

import { authClient } from '@/lib/auth';

export {
  fetchAssets,
  favoriteAssets,
  trashAssets,
  restoreAssets,
  deleteAssets,
} from '@workspace/core/photos';
export type { GridAsset, TimelinePage, AssetView } from '@workspace/core/photos';

const authHeaders = (): Record<string, string> => {
  const cookie = authClient.getCookie();
  return cookie ? { Cookie: cookie } : {};
};

/** Base64 in fixed chunks — avoids blowing the call stack on larger byte arrays. */
const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return globalThis.btoa(binary);
};

/** Fetch + decrypt an asset's thumbnail into a `data:` URI (or null if locked/unavailable). */
export const fetchThumbnailUri = async (
  assetId: string,
  encrypted: boolean,
): Promise<string | null> => {
  const response = await fetch(
    `${coreConfig().apiUrl}/api/v1/photos/assets/${assetId}/thumbnail`,
    { headers: authHeaders() },
  );
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());

  if (!encrypted) return `data:image/jpeg;base64,${bytesToBase64(bytes)}`;

  const key = await getDocContentKey(assetId);
  if (!key) return null;
  try {
    return `data:image/jpeg;base64,${bytesToBase64(secretboxOpen(bytes, key))}`;
  } catch {
    return null;
  }
};

/** Fetch + decrypt an asset's full-resolution original into a `data:` URI (or null). */
export const fetchOriginalUri = async (
  assetId: string,
  encrypted: boolean,
  mimeType = 'image/jpeg',
): Promise<string | null> => {
  const response = await fetch(
    `${coreConfig().apiUrl}/api/v1/photos/assets/${assetId}/original`,
    { headers: authHeaders() },
  );
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());

  if (!encrypted) return `data:${mimeType};base64,${bytesToBase64(bytes)}`;

  const key = await getDocContentKey(assetId);
  if (!key) return null;
  try {
    const plain = isStreamBlob(bytes) ? secretstreamOpenAll(bytes, key) : secretboxOpen(bytes, key);
    return `data:${mimeType};base64,${bytesToBase64(plain)}`;
  } catch {
    return null;
  }
};
