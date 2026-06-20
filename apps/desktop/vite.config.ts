import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import tsconfigPaths from "vite-tsconfig-paths"

const host = process.env.TAURI_DEV_HOST

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
  build: {
    // Match the web shell's default target. Tauri's boilerplate safari13/chrome105 is too old to
    // downlevel the CLIP/onnx worker's modern syntax; the webviews we target (recent WKWebView /
    // WebKitGTK / WebView2) all handle Vite's default `modules` target.
    outDir: "dist",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
  },
})
