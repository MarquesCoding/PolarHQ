"use client"

// Lightweight, opt-in debug logging. Enable with `localStorage.orbit.debug = "1"` (or
// `window.orbit.ml.enableLogs()`), then reload. Off by default so it never spams users.

const KEY = "orbit.debug"

export const isDebug = (): boolean => {
  try {
    return typeof localStorage !== "undefined" && Boolean(localStorage.getItem(KEY))
  } catch {
    return false
  }
}

export const setDebug = (on: boolean): void => {
  try {
    if (on) localStorage.setItem(KEY, "1")
    else localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

/** Namespaced console log, only when debug is on. */
export const dbg = (ns: string, ...args: unknown[]): void => {
  if (isDebug()) console.log(`%c[orbit:${ns}]`, "color:#7c3aed;font-weight:600", ...args)
}
