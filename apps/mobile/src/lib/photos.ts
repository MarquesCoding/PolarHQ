/**
 * RN photo helpers. The shared `fetchAssets` (an authenticated apiFetch) is reused as-is, but the
 * web thumbnail helper returns a `blob:` object URL via `URL.createObjectURL` (unsupported by RN's
 * <Image>) and uses raw cookie fetch. Here we authenticate the raw media fetch with the better-auth
 * cookie and return a `data:` URI that expo-image can render, reusing core's crypto for decryption.
 */
import * as FileSystem from 'expo-file-system/legacy';

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
  fetchAlbums,
  fetchAlbum,
  createAlbum,
  addToAlbum,
} from '@workspace/core/photos';
export type { GridAsset, TimelinePage, AssetView, Album, AlbumDetail } from '@workspace/core/photos';

import { decryptName } from '@workspace/core/e2e';
import type { GridAsset } from '@workspace/core/photos';

/** The display name of an asset: its decrypted name, falling back to the plaintext filename. */
export const assetName = (asset: GridAsset): string =>
  decryptName(asset.encryptedName) ?? asset.originalFilename ?? '';

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

/**
 * Fetch + decrypt a Drive node's thumbnail into a `data:` URI (or null). Mirrors core's
 * `fetchDecryptedThumbnail`, but returns a `data:` URI (RN has no `URL.createObjectURL`) and
 * authenticates the raw fetch with the better-auth cookie.
 */
export const fetchDriveThumbnailUri = async (
  nodeId: string,
  encrypted: boolean,
): Promise<string | null> => {
  const response = await fetch(
    `${coreConfig().apiUrl}/api/v1/drive/nodes/${nodeId}/thumbnail`,
    { headers: authHeaders() },
  );
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());

  if (!encrypted) return `data:image/jpeg;base64,${bytesToBase64(bytes)}`;

  const key = await getDocContentKey(nodeId);
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

const extForMime = (mime: string): string => {
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('webm')) return 'webm';
  if (mime.startsWith('video/')) return 'mp4';
  if (mime.includes('png')) return 'png';
  if (mime.includes('heic')) return 'heic';
  if (mime.includes('heif')) return 'heif';
  if (mime.includes('gif')) return 'gif';
  if (mime.includes('webp')) return 'webp';
  if (mime.startsWith('image/')) return 'jpg';
  if (mime.startsWith('audio/')) return 'm4a';
  return 'bin';
};

/**
 * Fetch + decrypt an asset's original to a temp `file://` (with a correct extension for its type).
 * Used by the native video player (too large for a base64 data URI) and by share / save-to-device.
 */
export const decryptOriginalToFile = async (
  assetId: string,
  encrypted: boolean,
  mimeType = 'application/octet-stream',
): Promise<string | null> => {
  const response = await fetch(
    `${coreConfig().apiUrl}/api/v1/photos/assets/${assetId}/original`,
    { headers: authHeaders() },
  );
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());

  let plain: Uint8Array = bytes;
  if (encrypted) {
    const key = await getDocContentKey(assetId);
    if (!key) return null;
    try {
      plain = isStreamBlob(bytes) ? secretstreamOpenAll(bytes, key) : secretboxOpen(bytes, key);
    } catch {
      return null;
    }
  }

  const uri = `${FileSystem.cacheDirectory}orig-${assetId}.${extForMime(mimeType)}`;
  await FileSystem.writeAsStringAsync(uri, bytesToBase64(plain), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
};

/** @deprecated use {@link decryptOriginalToFile} — kept for the existing video-player call site. */
export const fetchOriginalFile = (assetId: string, encrypted: boolean, mimeType = 'video/mp4') =>
  decryptOriginalToFile(assetId, encrypted, mimeType);
