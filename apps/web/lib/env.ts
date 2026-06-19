import { configureCore } from "@workspace/core/config"

/** Public client config. `APP_NAME` is the single source for the product name. */
export const APP_NAME = import.meta.env.VITE_APP_NAME ?? "PolarHQ"

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

/** App version + build identifier shown in the sidebar footer. */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "0.0.1"
export const APP_BUILD = import.meta.env.VITE_APP_BUILD ?? "dev"

/**
 * Feed the web shell's build-time env into the framework-agnostic core data layer. Importing this
 * module (it backs the app-wide `@lib/env` constants) configures core before any apiClient call.
 */
configureCore({
  appName: APP_NAME,
  apiUrl: API_URL,
  appVersion: APP_VERSION,
  appBuild: APP_BUILD,
})
