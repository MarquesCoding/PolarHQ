/**
 * Bearer session token, captured from better-auth's `set-auth-token` response header. The web shell
 * is same-origin with the API and authenticates with cookies, so this is just a harmless extra. But
 * a cross-origin shell (the Tauri desktop talking to a remote server) can't use the SameSite cookie
 * and can't set a `Cookie` header from a webview — so it authenticates with `Authorization: Bearer`
 * instead, and persists the token (via {@link configureAuthTokenStore}) so it survives a relaunch.
 */
let token: string | null = null
let save: ((value: string | null) => void) | null = null

/** Install persistence (desktop) and seed the in-memory token from it. */
export const configureAuthTokenStore = (store: {
  load: () => string | null
  save: (value: string | null) => void
}): void => {
  save = store.save
  token = store.load()
}

export const setAuthToken = (value: string | null): void => {
  token = value || null
  save?.(token)
}

export const getAuthToken = (): string | null => token
