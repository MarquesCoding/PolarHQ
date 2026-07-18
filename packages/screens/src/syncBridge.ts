/**
 * Desktop folder-sync bridge. The Tauri shell owns all the filesystem + Drive-upload logic and
 * registers an implementation on `window.__polarSync` at startup (mirroring the `__polarServer`
 * bridge). The cross-platform screen layer reads it through {@link getSyncBridge} so the "Synced
 * folders" UI can live in shared screens while the Tauri/FS code stays in the desktop app. On web the
 * bridge is absent and the UI hides itself.
 */

export interface SyncProgress {
  total: number
  done: number
  /** Name of the file currently uploading, or null when finished. */
  current: string | null
}

export interface SyncedFolderInfo {
  id: string
  localPath: string
  name: string
  fileCount: number
  /** The Drive folder this local folder mirrors into (so the UI can open the 1:1 copy + hide it from
   *  "My Drive"). */
  driveNodeId: string
  /** Epoch ms of the last successful sync, or null if never synced. */
  lastSyncedAt: number | null
}

export interface SyncResult {
  uploaded: number
  failed: number
}

export interface SyncBridge {
  list: () => Promise<SyncedFolderInfo[]>
  /** Open the native folder picker, register it, and create its Drive folder. Null if cancelled. */
  add: () => Promise<SyncedFolderInfo | null>
  /** Stop syncing a folder (leaves the already-uploaded Drive content in place). */
  remove: (id: string) => Promise<void>
  /** Push local changes up to Drive (one-way, hierarchy-preserving). */
  sync: (id: string, onProgress?: (progress: SyncProgress) => void) => Promise<SyncResult>
}

declare global {
  interface Window {
    __polarSync?: SyncBridge
  }
}

/** The desktop sync bridge, or null on web / before the shell registers it. */
export const getSyncBridge = (): SyncBridge | null =>
  typeof window !== "undefined" ? (window.__polarSync ?? null) : null
