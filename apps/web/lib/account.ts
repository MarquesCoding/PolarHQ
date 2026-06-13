import { apiFetch } from "@lib/apiClient"
import { dateLocale } from "@polarhq/i18n/format"

export type DevicePlatform = "ios" | "android" | "mac" | "windows" | "linux" | "web"

export interface Device {
  id: string
  label: string
  platform: DevicePlatform
  ipAddress: string | null
  createdAt: string
  lastActive: string
  expiresAt: string
  current: boolean
}

export const fetchDevices = (): Promise<{ devices: Device[] }> =>
  apiFetch("/api/v1/account/devices")

export const revokeDevice = (id: string): Promise<{ ok: true }> =>
  apiFetch("/api/v1/account/devices/revoke", {
    method: "POST",
    body: JSON.stringify({ id }),
  })

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
]

/** "2 hours ago", "now", etc. for a device's last-active timestamp, in the active UI language. */
export const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime()
  const relative = new Intl.RelativeTimeFormat(dateLocale(), { numeric: "auto" })
  if (diff < 60_000) return relative.format(0, "second")
  for (const [unit, ms] of STEPS) {
    if (diff >= ms) return relative.format(-Math.round(diff / ms), unit)
  }
  return relative.format(0, "second")
}
