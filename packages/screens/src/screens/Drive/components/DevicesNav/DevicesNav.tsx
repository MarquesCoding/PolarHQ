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
 * A discoverable peer device. The P2P transport (discovery, connection, remote directory transfer)
 * isn't implemented yet — `p2pStatus` is a stub — so no remote devices are listed; the row component
 * below carries the intended online/offline/connecting/failed states for when real discovery lands.
 */
interface P2pDevice {
  id: string
  name: string
  icon: string
  online: boolean
}

const CONNECT_TIMEOUT_MS = 15000

/** A remote device row: offline devices are greyed + inert; clicking a live one shows a spinner and,
 *  with no backend to complete the handshake, surfaces the failure state after 15s. */
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

/** DEVICES section: this computer (its real name, always shown on desktop) with its synced folders
 *  linking to their 1:1 Drive mirror, plus any discoverable P2P peers. Hidden on web. */
const DevicesNav = () => {
  const { t } = useTranslation("drive")
  const pathname = usePathname()
  const bridge = getSyncBridge()
  const host = getHost()
  const desktop = host.isDesktop
  const localName = host.deviceName || t("driveNav.thisDevice")

  const { data: synced = [] } = useQuery({
    queryKey: ["sync", "folders"],
    queryFn: () => bridge!.list(),
    enabled: Boolean(bridge),
  })
  const peers: P2pDevice[] = []

  if (!desktop && peers.length === 0) return null

  return (
    <>
      <SectionLabel>{t("driveNav.devices")}</SectionLabel>
      {desktop ? (
        <>
          <div className="text-foreground flex items-center gap-2.5 px-2.5 py-1.5 text-sm font-medium">
            <Icon name="laptop" className="size-[18px] shrink-0" />
            <span className="min-w-0 flex-1 truncate">{localName}</span>
          </div>
          {synced.length > 0 ? (
            synced.map((folder) => {
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
            })
          ) : (
            <p className="text-muted-foreground/60 px-2.5 pb-1 pl-8 text-xs">
              {t("driveNav.noSyncedFolders")}
            </p>
          )}
        </>
      ) : null}
      {peers.map((device) => (
        <P2pDeviceRow key={device.id} device={device} />
      ))}
    </>
  )
}

export default DevicesNav
