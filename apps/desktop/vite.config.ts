import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import tsconfigPaths from "vite-tsconfig-paths"

const host = process.env.TAURI_DEV_HOST

/** Bundle version is the one source of truth Tauri compiles into the binary — inject it so the
 *  sidebar footer always matches the actual build, never the (independently-bumped) top changelog
 *  entry, which is what left a stale version showing after a release. */
const tauriConf = JSON.parse(
  readFileSync(fileURLToPath(new URL("./src-tauri/tauri.conf.json", import.meta.url)), "utf8"),
) as { version?: string }
const appVersion = process.env.VITE_APP_VERSION ?? tauriConf.version ?? "0.0.0"

/** Reuse the web shell's static assets (onboarding images, locales) instead of duplicating them —
 *  both shells render the same `@workspace/screens`, which references `/onboarding/*` and `/locales/*`. */
const publicDir = fileURLToPath(new URL("../web/public", import.meta.url))

/**
 * Vite config tuned for Tauri (https://v2.tauri.app/start/frontend/vite/): a fixed dev port Tauri
 * can attach to, the Rust source excluded from the file watcher, and platform-aware build targets.
 * Otherwise identical to the web shell — both consume the same `@workspace/*` packages.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  publicDir,
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(appVersion),
  },
  build: {
    // Match the web shell's default target. Tauri's boilerplate safari13/chrome105 is too old to
    // downlevel the CLIP/onnx worker's modern syntax; the webviews we target (recent WKWebView /
    // WebKitGTK / WebView2) all handle Vite's default `modules` target.
    outDir: "dist",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
})
