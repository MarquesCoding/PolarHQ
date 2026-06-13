import { configureSdk } from "@polarhq/sdk/config"

/** Public client config. `APP_NAME` is the single source for the product name. */
export const APP_NAME = import.meta.env.VITE_APP_NAME ?? "Vault"

export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001"

/** App version + build identifier shown in the sidebar footer. */
export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "0.0.1"
export const APP_BUILD = import.meta.env.VITE_APP_BUILD ?? "dev"

/**
 * Bridge the Vite-inlined VITE_* values into the framework-agnostic SDK config.
 * Runs on import (main.tsx imports this before mounting), so the SDK is configured
 * before the first API call.
 */
configureSdk({ apiUrl: API_URL, appName: APP_NAME, version: APP_VERSION, build: APP_BUILD })
