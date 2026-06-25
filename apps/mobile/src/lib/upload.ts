/**
 * Encrypted photo upload for RN. Mirrors @workspace/core's uploadEncryptedMedia, but the web
 * version is built on File/FormData/canvas — here we pick via expo-image-picker, resize the
 * thumbnail with expo-image-manipulator, encrypt with core's crypto, and push the ciphertext with
 * expo-file-system's binary/multipart upload (authenticated with the better-auth cookie).
 */
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { coreConfig } from '@workspace/core/config';
import { secretboxSeal } from '@workspace/core/crypto';
import {
  createContentKey,
  encryptName,
  encryptedPlaceholder,
  isUnlocked,
  storeContentKey,
} from '@workspace/core/e2e';

import { authClient } from '@/lib/auth';

const authHeaders = (): Record<string, string> => {
  const cookie = authClient.getCookie();
  return cookie ? { Cookie: cookie } : {};
};

const base64ToBytes = (value: string): Uint8Array =>
  Uint8Array.from(globalThis.atob(value), (c) => c.charCodeAt(0));

const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return globalThis.btoa(binary);
};

const writeTemp = async (bytes: Uint8Array, name: string): Promise<string> => {
  const uri = `${FileSystem.cacheDirectory}${name}`;
  await FileSystem.writeAsStringAsync(uri, bytesToBase64(bytes), {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
};

export type UploadOutcome = 'uploaded' | 'cancelled' | 'denied' | 'locked';

export interface ImageUploadInput {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
}

/** Videos larger than this are skipped by backup — the in-memory encrypt path would OOM. */
const MAX_VIDEO_BYTES = 120 * 1024 * 1024;

interface MediaUploadInput extends ImageUploadInput {
  /** Source image to derive the encrypted thumbnail from (the asset itself, or a video poster). */
  posterUri?: string;
}

/**
 * Encrypt + upload one media original end-to-end: encrypt under a fresh content key (multipart
 * POST), wrap the key to the owner, and (when a poster is available) upload an encrypted thumbnail.
 * Shared by the manual picker, video backup, and the auto-backup loop. Throws on a failed upload.
 */
const uploadEncryptedMedia = async (input: MediaUploadInput): Promise<void> => {
  const key = createContentKey();
  const filename = input.fileName ?? 'photo.jpg';
  const mimeType = input.mimeType ?? 'image/jpeg';
  const encName = encryptName(filename);
  const placeholderName = encName ? encryptedPlaceholder() : filename;

  const original = base64ToBytes(
    await FileSystem.readAsStringAsync(input.uri, { encoding: FileSystem.EncodingType.Base64 }),
  );
  const originalUri = await writeTemp(secretboxSeal(original, key), placeholderName);

  const parameters: Record<string, string> = { encrypted: 'true', mimeType };
  if (input.width) parameters.width = String(input.width);
  if (input.height) parameters.height = String(input.height);
  if (encName) parameters.encryptedName = encName;

  const response = await FileSystem.uploadAsync(
    `${coreConfig().apiUrl}/api/v1/photos/assets`,
    originalUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'application/octet-stream',
      parameters,
      headers: authHeaders(),
    },
  );
  if (response.status >= 400) throw new Error(`Upload failed (${response.status})`);
  const { asset: created, mirrorNodeId } = JSON.parse(response.body) as {
    asset: { id: string };
    mirrorNodeId: string | null;
  };

  // Wrap the content key to the owner so the asset (and its Drive mirror) can be decrypted later.
  await storeContentKey(created.id, key);
  if (mirrorNodeId) await storeContentKey(mirrorNodeId, key);

  if (!input.posterUri) return;

  // Client-side thumbnail → encrypt → binary PUT.
  const thumb = await ImageManipulator.manipulateAsync(
    input.posterUri,
    [{ resize: { width: 512 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  if (thumb.base64) {
    const thumbUri = await writeTemp(
      secretboxSeal(base64ToBytes(thumb.base64), key),
      `thumb-${created.id}.bin`,
    );
    const putThumb = (url: string) =>
      FileSystem.uploadAsync(url, thumbUri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: { ...authHeaders(), 'content-type': 'application/octet-stream' },
      });
    await putThumb(`${coreConfig().apiUrl}/api/v1/photos/assets/${created.id}/thumbnail`);
    if (mirrorNodeId)
      await putThumb(`${coreConfig().apiUrl}/api/v1/drive/nodes/${mirrorNodeId}/thumbnail`).catch(
        () => undefined,
      );
  }
};

/** Encrypt + upload an image (its own pixels are the thumbnail source). */
export const uploadEncryptedImage = (input: ImageUploadInput): Promise<void> =>
  uploadEncryptedMedia({ ...input, posterUri: input.uri });

/** Encrypt + upload a video: a poster frame becomes the thumbnail. Skips files over the size cap. */
export const uploadEncryptedVideo = async (input: ImageUploadInput): Promise<void> => {
  const info = await FileSystem.getInfoAsync(input.uri);
  if (info.exists && typeof info.size === 'number' && info.size > MAX_VIDEO_BYTES) {
    throw new Error('Video exceeds the backup size limit');
  }
  const poster = await VideoThumbnails.getThumbnailAsync(input.uri, { time: 1000 }).catch(() => null);
  await uploadEncryptedMedia({
    ...input,
    mimeType: input.mimeType ?? 'video/mp4',
    posterUri: poster?.uri,
  });
};

/** Pick a photo from the library, encrypt it end-to-end, and upload it. */
export const pickAndUploadPhoto = async (): Promise<UploadOutcome> => {
  if (!isUnlocked()) return 'locked';

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return 'denied';

  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (picked.canceled || !picked.assets[0]) return 'cancelled';
  const asset = picked.assets[0];

  await uploadEncryptedImage({
    uri: asset.uri,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
  });
  return 'uploaded';
};
