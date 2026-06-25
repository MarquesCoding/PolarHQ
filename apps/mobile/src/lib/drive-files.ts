/**
 * Drive arbitrary-file upload + download for RN. Upload encrypts a picked document under a fresh
 * content key and POSTs the ciphertext to the Drive upload endpoint (mirrors core's
 * uploadEncryptedDriveFile). Download fetches the ciphertext, decrypts client-side, and opens the
 * native share sheet so the user can save/open it elsewhere. In-memory path — very large files are
 * capped (the web streaming-chunk path isn't ported yet).
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Share } from 'react-native';

import { coreConfig } from '@workspace/core/config';
import { isStreamBlob, secretboxOpen, secretboxSeal, secretstreamOpenAll } from '@workspace/core/crypto';
import {
  createContentKey,
  encryptName,
  encryptedPlaceholder,
  getDocContentKey,
  isUnlocked,
  storeContentKey,
} from '@workspace/core/e2e';

import { authClient } from '@/lib/auth';
import type { DriveNode } from '@/lib/drive';

const MAX_FILE_BYTES = 120 * 1024 * 1024;

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

export type FileUploadOutcome = 'uploaded' | 'cancelled' | 'locked' | 'too-large';

/** Pick an arbitrary file, encrypt it end-to-end, and upload it into the given Drive folder. */
export const pickAndUploadFile = async (parentId: string | null): Promise<FileUploadOutcome> => {
  if (!isUnlocked()) return 'locked';

  const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets?.[0]) return 'cancelled';
  const asset = picked.assets[0];
  if (asset.size && asset.size > MAX_FILE_BYTES) return 'too-large';

  const key = createContentKey();
  const mimeType = asset.mimeType ?? 'application/octet-stream';
  const encName = encryptName(asset.name);
  const placeholderName = encName ? encryptedPlaceholder() : asset.name;

  const original = base64ToBytes(
    await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 }),
  );
  const sealedUri = `${FileSystem.cacheDirectory}${placeholderName}`;
  await FileSystem.writeAsStringAsync(sealedUri, bytesToBase64(secretboxSeal(original, key)), {
    encoding: FileSystem.EncodingType.Base64,
  });

  const parameters: Record<string, string> = { mimeType, encrypted: 'true' };
  if (encName) parameters.encryptedName = encName;
  if (parentId) parameters.parentId = parentId;

  const response = await FileSystem.uploadAsync(`${coreConfig().apiUrl}/api/v1/drive/nodes/upload`, sealedUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: 'application/octet-stream',
    parameters,
    headers: authHeaders(),
  });
  if (response.status >= 400) throw new Error(`Upload failed (${response.status})`);

  const { node } = JSON.parse(response.body) as { node: { id: string } };
  await storeContentKey(node.id, key);
  return 'uploaded';
};

/** Fetch + decrypt a Drive file and open the native share sheet (save / open elsewhere). */
export const downloadAndShareDriveFile = async (node: DriveNode): Promise<boolean> => {
  if (!node.downloadUrl) return false;
  const url = node.downloadUrl.startsWith('http') ? node.downloadUrl : `${coreConfig().apiUrl}${node.downloadUrl}`;
  const response = await fetch(url, { headers: authHeaders() });
  if (!response.ok) return false;

  const bytes = new Uint8Array(await response.arrayBuffer());
  let plain: Uint8Array = bytes;
  if (node.encrypted) {
    const key = await getDocContentKey(node.id);
    if (!key) return false;
    plain = isStreamBlob(bytes) ? secretstreamOpenAll(bytes, key) : secretboxOpen(bytes, key);
  }

  const ext = node.name.includes('.') ? node.name.split('.').pop() : 'bin';
  const uri = `${FileSystem.cacheDirectory}dl-${node.id}.${ext}`;
  await FileSystem.writeAsStringAsync(uri, bytesToBase64(plain), { encoding: FileSystem.EncodingType.Base64 });
  await Share.share({ url: uri });
  return true;
};
