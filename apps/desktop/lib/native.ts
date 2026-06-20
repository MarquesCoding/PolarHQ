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
