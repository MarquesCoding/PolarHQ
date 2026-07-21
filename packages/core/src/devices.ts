import { apiFetch } from "./apiClient"
import { getHost } from "./host"

export type DevicePlatform = "macos" | "windows" | "linux" | "web" | "ios" | "android"
export type DeviceKind = "desktop" | "web" | "mobile"

/** A device registered on the account — one per client install (web session, desktop, mobile). */
export interface RegisteredDevice {
  id: string
  deviceId: string
  name: string
  platform: DevicePlatform
  kind: DeviceKind
  lastSeenAt: string
  createdAt: string
}

const DEVICE_ID_KEY = "polarhq.deviceId"

/** A stable per-install id, generated once and persisted, so re-login upserts the same device row. */
export const getDeviceId = (): string => {
  if (typeof localStorage === "undefined") return "unknown"
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `d_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

/** Only native app installs count as devices — desktop app or mobile app, never a browser tab. */
export const isNativeApp = (): boolean => {
  const host = getHost()
  return Boolean(host.isDesktop || host.isMobileApp)
}

const detectPlatform = (): DevicePlatform => {
  const host = getHost()
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : ""
  if (host.isDesktop) {
    if (/Mac/i.test(ua)) return "macos"
    if (/Win/i.test(ua)) return "windows"
    return "linux"
  }
  if (host.isMobileApp) return /Android/i.test(ua) ? "android" : "ios"
  return "web"
}

/** Describe this client for the registry: a friendly name (desktop supplies the machine name) plus
 *  its platform + kind. Only meaningful for native apps (see {@link isNativeApp}). */
export const describeThisDevice = (): { deviceId: string; name: string; platform: DevicePlatform; kind: DeviceKind } => {
  const host = getHost()
  const platform = detectPlatform()
  const kind: DeviceKind = host.isDesktop ? "desktop" : host.isMobileApp ? "mobile" : "web"
  const name = host.deviceName || (host.isDesktop ? "Desktop" : host.isMobileApp ? "Mobile" : "Web")
  return { deviceId: getDeviceId(), name, platform, kind }
}

export const registerDevice = (): Promise<{ device: RegisteredDevice }> =>
  apiFetch("/api/v1/devices/register", {
    method: "POST",
    body: JSON.stringify(describeThisDevice()),
  })

export const fetchRegisteredDevices = (): Promise<{ devices: RegisteredDevice[] }> =>
  apiFetch("/api/v1/devices")

export const heartbeatDevice = (): Promise<{ ok: true }> =>
  apiFetch("/api/v1/devices/heartbeat", {
    method: "POST",
    body: JSON.stringify({ deviceId: getDeviceId() }),
  })

export const forgetDevice = (id: string): Promise<{ ok: true }> =>
  apiFetch(`/api/v1/devices/${id}`, { method: "DELETE" })
