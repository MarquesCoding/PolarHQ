"use client"

import { type ComponentType, useEffect, useState } from "react"
import { AppleLogo, LinuxLogo, WindowsLogo } from "@phosphor-icons/react"

const REPO = "MarquesCoding/PolarHQ"
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`

interface Target {
  label: string
  icon: ComponentType<{ className?: string; weight?: "fill" | "regular" }>
  match: RegExp
}

// Latest-release installers by platform. Asset names look like PolarHQ_0.7.0_aarch64.dmg /
// _x64.dmg / _x64-setup.exe / _amd64.AppImage / _amd64.deb.
const TARGETS: Target[] = [
  { label: "macOS (Apple Silicon)", icon: AppleLogo, match: /aarch64\.dmg$/ },
  { label: "macOS (Intel)", icon: AppleLogo, match: /x64\.dmg$/ },
  { label: "Windows", icon: WindowsLogo, match: /-setup\.exe$/ },
  { label: "Linux (AppImage)", icon: LinuxLogo, match: /\.AppImage$/ },
  { label: "Linux (.deb)", icon: LinuxLogo, match: /amd64\.deb$/ },
]

interface Asset {
  name: string
  browser_download_url: string
}

/** Direct per-platform installers for the latest release (shown under the OS-detected button). Falls
 *  back to the releases page for any asset it can't resolve. */
const PlatformDownloads = () => {
  const [assets, setAssets] = useState<Asset[]>([])

  useEffect(() => {
    let cancelled = false
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad status"))))
      .then((release: { assets: Asset[] }) => {
        if (!cancelled) setAssets(release.assets ?? [])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const linkFor = (target: Target): string =>
    assets.find((asset) => target.match.test(asset.name))?.browser_download_url ?? RELEASES_PAGE

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
      {TARGETS.map((target) => (
        <a
          key={target.label}
          href={linkFor(target)}
          target="_blank"
          rel="noreferrer"
          className="text-foreground/60 hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
        >
          <target.icon className="size-3.5" weight="fill" />
          {target.label}
        </a>
      ))}
    </div>
  )
}

export default PlatformDownloads
