/**
 * Host capabilities the surrounding shell can provide. Web leaves the defaults; the Tauri desktop
 * shell calls {@link configureHost} at startup to advertise that it's desktop and to supply native
 * affordances (e.g. opening a URL in the system browser, needed for OAuth that can't run inside the
 * webview). Screens read {@link getHost} so they can branch without importing any Tauri packages.
 */
export interface HostCapabilities {
  isDesktop: boolean
  /** Open a URL in the user's real browser (not the app webview). Desktop-only. */
  openExternal?: (url: string) => Promise<void> | void
}

let host: HostCapabilities = { isDesktop: false }

/** Called once by the desktop shell at startup. */
export const configureHost = (next: Partial<HostCapabilities>): void => {
  host = { ...host, ...next }
}

export const getHost = (): HostCapabilities => host
