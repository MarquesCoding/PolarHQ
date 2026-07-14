/**
 * Host capabilities the surrounding shell can provide. Web leaves the defaults; the Tauri desktop
 * shell calls {@link configureHost} at startup to advertise that it's desktop and to supply native
 * affordances (e.g. opening a URL in the system browser, needed for OAuth that can't run inside the
 * webview). Screens read {@link getHost} so they can branch without importing any Tauri packages.
 */
export interface HostCapabilities {
  isDesktop: boolean
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
}

let host: HostCapabilities = { isDesktop: false }

/** Called once by the desktop shell at startup. */
export const configureHost = (next: Partial<HostCapabilities>): void => {
  host = { ...host, ...next }
}

export const getHost = (): HostCapabilities => host
