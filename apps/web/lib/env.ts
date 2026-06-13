import { configureSdk } from "@polarhq/sdk/config"

/** Public client config. `APP_NAME` is the single source for the product name. */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "Vault"

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"

/** App version + build identifier shown in the sidebar footer. */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.1"
export const APP_BUILD = process.env.NEXT_PUBLIC_APP_BUILD ?? "dev"

/**
 * Bridge the Next-inlined NEXT_PUBLIC_* values into the framework-agnostic SDK
 * config. Runs on import; env.ts is imported by both the server root layout and
 * the client Providers, so the SDK is configured on both sides before any call.
 */
configureSdk({ apiUrl: API_URL, appName: APP_NAME, version: APP_VERSION, build: APP_BUILD })
