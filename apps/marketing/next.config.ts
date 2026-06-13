import type { NextConfig } from "next"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

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
  transpilePackages: ["@polarhq/ui"],
  turbopack: {
    resolveAlias: nucleoAliases,
  },
}

export default nextConfig
