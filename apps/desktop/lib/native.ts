import { convertFileSrc, invoke } from "@tauri-apps/api/core"

/**
 * Write decrypted media bytes to a temp file and return an asset-protocol URL the webview can load.
 * Used so video plays through a real file decoded by macOS's native codecs (HEVC/.mov) — WKWebView
 * can't decode those from a blob: URL. Bytes go over the raw IPC body so large videos stay fast.
 */
export const nativeMediaUrl = async (bytes: Uint8Array, mimeType: string): Promise<string> => {
  const ext = mimeType.includes("quicktime")
    ? "mov"
    : mimeType.includes("webm")
      ? "webm"
      : mimeType.includes("mp4")
        ? "mp4"
        : "mp4"
  const path = await invoke<string>("write_temp_media", bytes, { headers: { "x-media-ext": ext } })
  return convertFileSrc(path)
}

/**
 * Typed bridge to the Rust command surface (`src-tauri/src/commands.rs`), reached over Tauri's IPC.
 * These are stubs today — the native pipelines (gaussian-splat generation, peer-to-peer device
 * linking, device sync) are not implemented yet, but the `invoke` surface is wired so frontend
 * features can target it now. Only call these inside the desktop shell (Tauri context).
 */

/**
 * Generate a 3D point-cloud "splat" from an image and return an asset-protocol URL for the produced
 * `.ply`. The bytes are staged to a temp file (`write_temp_media`), the native pipeline
 * (`generate_splat`, monocular depth -> colored point cloud, fully offline) writes a PLY next to it,
 * and its path is returned as a webview-loadable URL. Feed the URL to the 3D ModelViewer.
 */
export const generateSplat = async (bytes: Uint8Array, mimeType: string): Promise<string> => {
  const ext = mimeType.includes("png")
    ? "png"
    : mimeType.includes("webp")
      ? "webp"
      : "jpg"
  const inputPath = await invoke<string>("write_temp_media", bytes, {
    headers: { "x-media-ext": ext },
  })
  const plyPath = await invoke<string>("generate_splat", { inputPath })
  return convertFileSrc(plyPath)
}

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

/** Switch the launch updater to a small, traffic-light-free window (Discord-style), or back to the
 *  full app window. */
export const updaterWindowMode = (compact: boolean): Promise<void> =>
  invoke("updater_window_mode", { compact })
