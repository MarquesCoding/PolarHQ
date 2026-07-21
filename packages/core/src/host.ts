/**
 * Host capabilities the surrounding shell can provide. Web leaves the defaults; the Tauri desktop
 * shell calls {@link configureHost} at startup to advertise that it's desktop and to supply native
 * affordances (e.g. opening a URL in the system browser, needed for OAuth that can't run inside the
 * webview). Screens read {@link getHost} so they can branch without importing any Tauri packages.
 */
export interface HostCapabilities {
  isDesktop: boolean
  /** True in the native mobile (React Native) app, so it registers as a real device (not a browser). */
  isMobileApp?: boolean
  /** Friendly name of the local machine (e.g. macOS ComputerName). Desktop-only. */
  deviceName?: string
  /** Open a URL in the user's real browser (not the app webview). Desktop-only. */
  openExternal?: (url: string) => Promise<void> | void
  /**
   * Write decrypted media bytes to a temp file and return a webview-loadable URL for it. The Tauri
   * desktop shell provides this so video plays through a real file (decoded by macOS's native
   * codecs, e.g. HEVC) instead of a `blob:` URL, which WKWebView can't decode for many formats.
   */
  nativeMediaUrl?: (bytes: Uint8Array, mimeType: string) => Promise<string>
  /**
   * Generate a 3D point-cloud "splat" from an image and return a webview-loadable URL for the
   * resulting `.ply`. The Tauri desktop shell provides this; it runs an offline monocular-depth
   * pipeline natively (no ML runtime, network, or Python/CUDA). Absent on web.
   */
  generateSplat?: (bytes: Uint8Array, mimeType: string) => Promise<string>
  /** Whether Apple SHARP is provisioned (real 3DGS) vs. the heuristic fallback. Desktop only. */
  sharpAvailable?: () => Promise<boolean>
  /** Provision SHARP on demand (uv + Python env + ml-sharp + checkpoint), reporting progress phases
   *  ("installing-uv" | "downloading-sharp" | "creating-env" | "installing-deps" |
   *  "downloading-model" | "ready"). Desktop only. */
  sharpSetup?: (onPhase?: (phase: string) => void) => Promise<void>
  /** The desktop job store — every long-running action is a tracked {@link Job}. Absent on web. */
  jobs?: JobsHost
}

/** Lifecycle of a background job in the desktop job manager. */
export type JobState = "queued" | "running" | "done" | "failed" | "cancelled" | "interrupted"

export interface Job {
  id: string
  /** Stable per-action key for dedup/retry (e.g. a synced folder id); null when one-shot. */
  key: string | null
  kind: string
  name: string
  state: JobState
  progress: { done: number; total: number; current: string | null }
  error: string | null
  retriable: boolean
  createdAt: number
  updatedAt: number
}

/** A partial update pushed to a job by a webview-orchestrated action. */
export interface JobPatch {
  state?: JobState
  done?: number
  total?: number
  current?: string | null
  error?: string | null
  name?: string
  retriable?: boolean
}

/** The desktop job manager, backed by the Rust store. Webview-orchestrated actions (sync, uploads)
 *  create + report into it so all jobs share one authoritative, persisted store. */
export interface JobsHost {
  list: () => Promise<Job[]>
  create: (kind: string, name: string, key?: string) => Promise<string>
  report: (id: string, patch: JobPatch) => Promise<void>
  cancel: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  cancelled: (id: string) => Promise<boolean>
  /** Live job updates; returns an unsubscribe. */
  subscribe: (onUpdate: (job: Job) => void, onRemove: (id: string) => void) => () => void
}

let host: HostCapabilities = { isDesktop: false }

/** Called once by the desktop shell at startup. */
export const configureHost = (next: Partial<HostCapabilities>): void => {
  host = { ...host, ...next }
}

export const getHost = (): HostCapabilities => host
