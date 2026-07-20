"use client"

import { useEffect, useState } from "react"
import { AppleLogo, DownloadSimple, LinuxLogo, WindowsLogo } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"

const REPO = "MarquesCoding/PolarHQ"
const RELEASES_PAGE = `https://github.com/${REPO}/releases/latest`

type OS = "mac" | "windows" | "linux" | "other"

const detectOS = (): OS => {
  if (typeof navigator === "undefined") return "other"
  const ua = navigator.userAgent
  if (/Windows/i.test(ua)) return "windows"
  if (/Mac/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua)) return "mac"
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return "linux"
  return "other"
}

const LABEL: Record<OS, string> = {
  mac: "Download for macOS",
  windows: "Download for Windows",
  linux: "Download for Linux",
  other: "Download for desktop",
}

const ICON: Record<OS, typeof AppleLogo> = {
  mac: AppleLogo,
  windows: WindowsLogo,
  linux: LinuxLogo,
  other: DownloadSimple,
}

// Pick the best installer asset for the detected OS. Names look like
// PolarHQ_0.5.0_aarch64.dmg / _x64-setup.exe / _amd64.AppImage — so match by extension/arch.
const matchAsset = (names: string[], os: OS): string | undefined => {
  const pick = (re: RegExp) => names.find((n) => re.test(n))
  if (os === "mac") return pick(/aarch64\.dmg$/) ?? pick(/\.dmg$/)
  if (os === "windows") return pick(/-setup\.exe$/) ?? pick(/\.exe$/) ?? pick(/\.msi$/)
  if (os === "linux") return pick(/\.AppImage$/) ?? pick(/\.deb$/)
  return undefined
}

interface Asset {
  name: string
  browser_download_url: string
}

const DownloadButton = ({ className }: { className?: string }) => {
  const [os, setOs] = useState<OS>("other")
  const [href, setHref] = useState(RELEASES_PAGE)

  useEffect(() => {
    const detected = detectOS()
    setOs(detected)
    if (detected === "other") return

    let cancelled = false
    fetch(`https://api.github.com/repos/${REPO}/releases?per_page=5`, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad status"))))
      .then((releases: { assets: Asset[] }[]) => {
        if (cancelled) return
        for (const release of releases) {
          const name = matchAsset(
            release.assets.map((a) => a.name),
            detected,
          )
          const asset = name ? release.assets.find((a) => a.name === name) : undefined
          if (asset) {
            setHref(asset.browser_download_url)
            return
          }
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const Icon = ICON[os]

  return (
    <Button render={<a href={href} target="_blank" rel="noreferrer" />} size="lg" className={className}>
      <Icon className="size-4" weight="fill" />
      {LABEL[os]}
    </Button>
  )
}

export default DownloadButton
