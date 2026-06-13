/**
 * Runtime configuration for the SDK. The SDK is framework-agnostic and never reads
 * `process.env` / `import.meta.env` itself — each host app (Next, Vite, Tauri, RN)
 * reads its own environment and calls `configureSdk` once at startup. Until then the
 * defaults below (local dev) apply.
 */
export interface SdkConfig {
  apiUrl: string
  appName: string
  version: string
  build: string
}

const config: SdkConfig = {
  apiUrl: "http://localhost:3001",
  appName: "Vault",
  version: "0.0.1",
  build: "dev",
}

/** Merge host-provided config into the SDK singleton. Call once at app startup. */
export const configureSdk = (partial: Partial<SdkConfig>): void => {
  Object.assign(config, partial)
}

/** Read the current SDK config. */
export const sdkConfig = (): Readonly<SdkConfig> => config
