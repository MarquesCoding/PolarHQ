/**
 * Camera-roll auto-backup. Walks the device photo library and uploads anything not already backed
 * up (tracked by MediaLibrary asset id in a local state file), reusing the E2E image upload. Runs
 * in the foreground while the app is open (a background task is a later addition). Photos only for
 * now — video backup needs a poster pipeline.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as SecureStore from 'expo-secure-store';

import { isUnlocked } from '@workspace/core/e2e';

import { uploadEncryptedImage } from '@/lib/upload';

const ENABLED_KEY = 'polarhq.backup.enabled';
const STATE_FILE = `${FileSystem.documentDirectory}backup-state.json`;

export const isBackupEnabled = (): boolean => SecureStore.getItem(ENABLED_KEY) === '1';
export const setBackupEnabled = (on: boolean): Promise<void> =>
  SecureStore.setItemAsync(ENABLED_KEY, on ? '1' : '0');

const loadUploaded = async (): Promise<Set<string>> => {
  try {
    const info = await FileSystem.getInfoAsync(STATE_FILE);
    if (!info.exists) return new Set();
    return new Set(JSON.parse(await FileSystem.readAsStringAsync(STATE_FILE)) as string[]);
  } catch {
    return new Set();
  }
};

const saveUploaded = (set: Set<string>): Promise<void> =>
  FileSystem.writeAsStringAsync(STATE_FILE, JSON.stringify([...set])).catch(() => undefined);

export const backedUpCount = async (): Promise<number> => (await loadUploaded()).size;

const mimeFromName = (name?: string): string => {
  const ext = (name?.split('.').pop() ?? '').toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
};

export interface BackupProgress {
  done: number;
  total: number;
  running: boolean;
}

export type BackupResult = 'done' | 'locked' | 'denied' | 'running' | 'nothing';

let running = false;

// Tiny pub/sub so any screen (the Settings card and the Photos header pill) can show live progress.
type Listener = (p: BackupProgress | null) => void;
const listeners = new Set<Listener>();
let currentProgress: BackupProgress | null = null;

export const subscribeBackup = (fn: Listener): (() => void) => {
  listeners.add(fn);
  fn(currentProgress);
  return () => {
    listeners.delete(fn);
  };
};

const emit = (p: BackupProgress | null) => {
  currentProgress = p;
  for (const fn of listeners) fn(p);
};

/** Upload any not-yet-backed-up photos. Safe to call repeatedly; no-ops if already running. */
export const runBackup = async (onProgress?: (p: BackupProgress) => void): Promise<BackupResult> => {
  if (running) return 'running';
  if (!isUnlocked()) return 'locked';

  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) return 'denied';

  running = true;
  const report = (p: BackupProgress) => {
    onProgress?.(p);
    emit(p.running ? p : null);
  };
  try {
    const uploaded = await loadUploaded();

    const all: MediaLibrary.Asset[] = [];
    let after: string | undefined;
    do {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
        first: 100,
        after,
        sortBy: [MediaLibrary.SortBy.creationTime],
      });
      all.push(...page.assets);
      after = page.hasNextPage ? page.endCursor : undefined;
    } while (after);

    const pending = all.filter((a) => !uploaded.has(a.id));
    const total = pending.length;
    if (total === 0) {
      report({ done: 0, total: 0, running: false });
      return 'nothing';
    }

    let done = 0;
    report({ done, total, running: true });
    for (const asset of pending) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(asset);
        await uploadEncryptedImage({
          uri: info.localUri ?? asset.uri,
          fileName: asset.filename,
          mimeType: mimeFromName(asset.filename),
          width: asset.width,
          height: asset.height,
        });
        uploaded.add(asset.id);
        if (done % 5 === 0) await saveUploaded(uploaded);
      } catch {
        /* skip this asset, continue with the rest */
      }
      done += 1;
      report({ done, total, running: true });
    }
    await saveUploaded(uploaded);
    report({ done, total, running: false });
    return 'done';
  } finally {
    running = false;
  }
};
