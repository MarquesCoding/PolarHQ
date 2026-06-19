import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui", "@workspace/i18n", "@workspace/core"],
}

export default nextConfig
