import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/i18n", "@workspace/core", "@workspace/screens"],
}

export default nextConfig
