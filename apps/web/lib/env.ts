import { configureCore } from "@workspace/core/config"

/** Public client config. `APP_NAME` is the single source for the product name. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "PolarHQ"

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

/** App version + build identifier shown in the sidebar footer. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.1"
export const APP_BUILD = process.env.NEXT_PUBLIC_APP_BUILD ?? "dev"

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
