import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { authClient } from "@workspace/core/authClient"
import { heartbeatDevice, isNativeApp, registerDevice } from "@workspace/core/devices"
import { useLiveEvents } from "./useLiveEvents"

const HEARTBEAT_MS = 5 * 60 * 1000

/**
 * Registers this client in the account's device registry once a session exists, then heartbeats so
 * its online state stays fresh, and refreshes the device list when another client changes it. Only
 * native apps register (desktop + mobile app) — a browser tab is not a device.
 */
export const useDeviceRegistration = (): void => {
  const { data: session } = authClient.useSession()
  const authed = Boolean(session?.user) && isNativeApp()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!authed) return
    void registerDevice()
      .then(() => queryClient.invalidateQueries({ queryKey: ["devices", "registered"] }))
      .catch(() => undefined)
    const interval = window.setInterval(() => {
      void heartbeatDevice().catch(() => undefined)
    }, HEARTBEAT_MS)
    return () => window.clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  useLiveEvents((event) => {
    if (event.type === "device.changed") {
      void queryClient.invalidateQueries({ queryKey: ["devices", "registered"] })
    }
  }, authed)
}
