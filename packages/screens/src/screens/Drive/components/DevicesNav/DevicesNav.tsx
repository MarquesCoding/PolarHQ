import { useEffect, useRef, useState } from "react"
import { AppLink as Link, usePathname } from "@workspace/screens/platform"
import { getHost } from "@workspace/core/host"
import { getSyncBridge } from "@workspace/screens/syncBridge"
import { Icon } from "@workspace/screens/icons"
import { SectionLabel, navRowClass } from "@components/FlatShell"
import Spinner from "@components/Spinner/Spinner"
import { cn } from "@workspace/ui/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

/**
 * Remote peer-to-peer devices. The P2P transport (discovery, connection, remote directory transfer)
 * is not implemented yet — `p2pStatus` is a stub — so this list is a placeholder demonstrating the
 * intended states (online/offline/connecting/failed). Swap for real discovery once P2P lands.
 */
interface P2pDevice {
  id: string
  name: string
  icon: string
  online: boolean
}
const P2P_DEVICES: P2pDevice[] = [
  { id: "p2p-macbook", name: "MacBook Pro", icon: "laptop", online: true },
  { id: "p2p-iphone", name: "iPhone", icon: "device-mobile", online: false },
]

const CONNECT_TIMEOUT_MS = 15000

/** A P2P device row. Offline devices are greyed + inert; clicking a live one shows a spinner and,
 *  since there's no backend to complete the handshake, surfaces the failure state after 15s. */
const P2pDeviceRow = ({ device }: { device: P2pDevice }) => {
  const [state, setState] = useState<"idle" | "connecting" | "failed">("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const connect = () => {
    if (!device.online || state === "connecting") return
    setState("connecting")
    timer.current = setTimeout(() => setState("failed"), CONNECT_TIMEOUT_MS)
  }

  return (
    <button
      type="button"
      onClick={connect}
      disabled={!device.online}
      className={cn(navRowClass(false, true), "w-full", !device.online && "opacity-40")}
    >
      <Icon name={device.icon} className="relative size-[18px] shrink-0" />
      <span className="relative min-w-0 flex-1 truncate text-left">{device.name}</span>
      {state === "connecting" ? <Spinner className="relative size-4" /> : null}
      {state === "failed" ? (
        <Icon name="circle-warning" className="relative size-4 text-amber-500" />
      ) : null}
    </button>
  )
}

/** DEVICES section of the Drive sidebar: this computer's synced folders (the 1:1 Drive mirror, no P2P
 *  needed) plus discoverable P2P devices. Hidden entirely when there are no devices (e.g. on web). */
const DevicesNav = () => {
  const { t } = useTranslation("drive")
  const pathname = usePathname()
  const bridge = getSyncBridge()
  const desktop = getHost().isDesktop

  const { data: synced = [] } = useQuery({
    queryKey: ["sync", "folders"],
    queryFn: () => bridge!.list(),
    enabled: Boolean(bridge),
  })
  const devices = desktop ? P2P_DEVICES : []

  if (synced.length === 0 && devices.length === 0) return null

  return (
    <>
      <SectionLabel>{t("driveNav.devices")}</SectionLabel>
      {bridge && synced.length > 0 ? (
        <>
          <div className="text-muted-foreground flex items-center gap-2.5 px-2.5 py-1.5 text-sm">
            <Icon name="laptop" className="size-[18px] shrink-0" />
            <span className="min-w-0 flex-1 truncate">{t("driveNav.thisMac")}</span>
          </div>
          {synced.map((folder) => {
            const active = pathname === `/drive/${folder.driveNodeId}`
            return (
              <Link
                key={folder.id}
                href={`/drive/${folder.driveNodeId}`}
                className={cn(navRowClass(active, true), "pl-8", active && "bg-sidebar-accent/60")}
              >
                <Icon name="folder" className="relative size-4 shrink-0" />
                <span className="relative min-w-0 flex-1 truncate">{folder.name}</span>
              </Link>
            )
          })}
        </>
      ) : null}
      {devices.map((device) => (
        <P2pDeviceRow key={device.id} device={device} />
      ))}
    </>
  )
}

export default DevicesNav
