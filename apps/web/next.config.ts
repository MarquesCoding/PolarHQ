import type { NextConfig } from "next"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

/**
 * The Nucleo icon packs are optional dependencies installed only when a
 * NUCLEO_LICENSE_KEY is provided. Any pack that isn't installed has its
 * specifier aliased to a local empty stub so the build still resolves and the
 * UI falls back to Tabler.
 */
const optionalNucleoPacks = ["nucleo-core-fill-24", "nucleo-ui-fill-duo-18"]

const nucleoAliases = optionalNucleoPacks.reduce<Record<string, string>>((aliases, pack) => {
  try {
    require.resolve(pack)
  } catch {
    aliases[pack] = "./lib/nucleoStub.ts"
  }
  return aliases
}, {})

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  turbopack: {
    resolveAlias: nucleoAliases,
  },
}

export default nextConfig
