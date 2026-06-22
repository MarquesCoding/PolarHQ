import { invoke } from "@tauri-apps/api/core"

/**
 * Typed bridge to the Rust command surface (`src-tauri/src/commands.rs`), reached over Tauri's IPC.
 * These are stubs today — the native pipelines (gaussian-splat generation, peer-to-peer device
 * linking, device sync) are not implemented yet, but the `invoke` surface is wired so frontend
 * features can target it now. Only call these inside the desktop shell (Tauri context).
 */

/** Generate a 3D Gaussian-splat scene from a source image/video path. Rejects until implemented. */
export const generateSplat = (inputPath: string): Promise<string> =>
  invoke<string>("generate_splat", { inputPath })

/** Current peer-to-peer device-link status (e.g. `"offline"`). */
export const p2pStatus = (): Promise<string> => invoke<string>("p2p_status")

/** Trigger a device-sync pass. Rejects until implemented. */
export const syncNow = (): Promise<string> => invoke<string>("sync_now")

/** One node in a synced folder's index (mirrors the Rust `IndexEntry`). */
export interface SyncEntry {
  /** POSIX-style path relative to the sync root. */
  relPath: string
  isDir: boolean
  size: number
  /** Last-modified, ms since the Unix epoch. */
  modifiedMs: number
  /** blake3 content id (empty for directories); the source of truth for "changed". */
  hash: string
}

/** Walk a local folder into a flat index (gitignore-aware, sampled content hashes). The JS sync
 *  controller reconciles this against the remote Drive tree. */
export const syncIndex = (path: string): Promise<SyncEntry[]> =>
  invoke<SyncEntry[]>("sync_index", { path })

/** Start watching a synced folder; the webview receives a `sync://change` event (payload = the
 *  folder path) on any filesystem change. Idempotent per path. */
export const syncStartWatch = (path: string): Promise<void> => invoke("sync_start_watch", { path })

/** Stop watching a synced folder. */
export const syncStopWatch = (path: string): Promise<void> => invoke("sync_stop_watch", { path })

/** Read a synced file's raw bytes (Rust-native, no fs-plugin path scope) for the sync controller to
 *  encrypt + upload. Returns an `ArrayBuffer` — bytes ride the binary IPC channel, not JSON. */
export const syncReadFile = (path: string): Promise<ArrayBuffer> =>
  invoke<ArrayBuffer>("sync_read_file", { path })
