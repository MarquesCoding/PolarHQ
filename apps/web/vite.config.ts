import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

const require = createRequire(import.meta.url)

/**
 * The Nucleo icon packs are optional dependencies installed only when a
 * NUCLEO_LICENSE_KEY is provided. Any pack that isn't installed is aliased to a
 * local empty stub so the build still resolves and the UI falls back to Tabler.
 */
const optionalNucleoPacks = ["nucleo-core-fill-24", "nucleo-ui-fill-duo-18"]
const nucleoStub = fileURLToPath(new URL("./lib/nucleoStub.ts", import.meta.url))
const nucleoAliases = optionalNucleoPacks.reduce<Record<string, string>>((aliases, pack) => {
  try {
    require.resolve(pack)
  } catch {
    aliases[pack] = nucleoStub
  }
  return aliases
}, {})

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: { alias: nucleoAliases },
  server: { port: 3000 },
  preview: { port: 3000, host: true },
})
