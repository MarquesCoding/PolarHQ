/**
 * Runtime configuration for the core data layer, injected by each shell at startup so the package
 * stays free of any framework- or build-specific env access. The web shell reads
 * `process.env.NEXT_PUBLIC_*` and calls {@link configureCore}; the Tauri/Vite desktop shell will
 * supply its own values the same way. Defaults match the historic dev fallbacks so calls made
 * before configuration still resolve sensibly.
 */
export interface CoreConfig {
  appName: string
  apiUrl: string
  appVersion: string
  appBuild: string
  /** True when the shell is running from a dev server (not a packaged build) — used to hide the
   *  version/changelog and other release-only chrome. */
  dev: boolean
}

const DEFAULTS: CoreConfig = {
  appName: "PolarHQ",
  apiUrl: "http://localhost:3001",
  appVersion: "0.0.1",
  appBuild: "dev",
  dev: false,
}

let current: CoreConfig = DEFAULTS

/** Each shell calls this once at startup with its build-time values. */
export const configureCore = (config: Partial<CoreConfig>): void => {
  current = { ...DEFAULTS, ...config }
}

/** The active configuration (defaults until a shell calls {@link configureCore}). */
export const coreConfig = (): CoreConfig => current
