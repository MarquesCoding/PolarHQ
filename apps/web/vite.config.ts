import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import tsconfigPaths from "vite-tsconfig-paths"

/** Hosts `vite preview` (the production container's server) will answer for. Derived from the same
 *  env the rest of the stack already gets — PUBLIC_URL / WEB_URL — so the public domain flows in from
 *  the Docker config automatically, with an optional explicit ALLOWED_HOSTS override (comma-separated).
 *  Empty in local dev → Vite's default (localhost only). */
const hostOf = (url: string | undefined): string | undefined => {
  if (!url) return undefined
  try {
    return new URL(url).hostname
  } catch {
    return undefined
  }
}

const allowedHosts = [
  ...(process.env.ALLOWED_HOSTS?.split(",") ?? []),
  hostOf(process.env.PUBLIC_URL),
  hostOf(process.env.WEB_URL),
]
  .map((h) => h?.trim())
  .filter((h): h is string => Boolean(h))

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: { port: 3000 },
  preview: {
    port: 3000,
    allowedHosts: allowedHosts.length ? allowedHosts : undefined,
  },
  build: { outDir: "dist" },
})
