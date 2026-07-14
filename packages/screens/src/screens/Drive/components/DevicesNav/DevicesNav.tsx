import { useEffect, useRef, useState } from "react"
import { AppLink as Link, usePathname } from "@workspace/screens/platform"
import { getHost } from "@workspace/core/host"
import { fetchSetupStatus } from "@workspace/core/setup"
import { getSyncBridge } from "@workspace/screens/syncBridge"
import { Icon } from "@workspace/screens/icons"
import { SectionLabel, navRowClass } from "@components/FlatShell"
import Spinner from "@components/Spinner/Spinner"
import { cn } from "@workspace/ui/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"

interface P2pDevice {
  id: string
  name: string
  icon: string
  online: boolean
}

const CONNECT_TIMEOUT_MS = 15000

const isMyDrive = (pathname: string): boolean =>
  /^\/drive\/[^/]+$/.test(pathname) &&
  !["/drive/trash", "/drive/overview", "/drive/recent", "/drive/favorites"].includes(pathname)

/** A small uppercase type tag (CLOUD / LOCAL / P2P) shown next to a device's name. */
const DeviceBadge = ({ label }: { label: string }) => (
  <span className="bg-sidebar-accent text-muted-foreground/80 shrink-0 rounded px-1.5 py-px text-[9px] font-semibold tracking-wider uppercase">
    {label}
  </span>
)

/** A device's title row (cloud / this computer / a peer) — not itself a link; its contents are. */
const DeviceHeader = ({ icon, name, badge }: { icon: string; name: string; badge: string }) => (
  <div className="text-foreground flex items-center gap-2.5 px-2.5 py-1.5 text-sm font-medium">
    <Icon name={icon} className="size-[18px] shrink-0" />
    <span className="min-w-0 flex-1 truncate">{name}</span>
    <DeviceBadge label={badge} />
  </div>
)

/** An indented item under a device (a Drive view or a synced folder). */
const DeviceChild = ({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) => (
  <Link
    href={href}
    className={cn(navRowClass(active, true), "pl-8", active && "bg-sidebar-accent/60")}
  >
    <Icon name={icon} className="relative size-4 shrink-0" />
    <span className="relative min-w-0 flex-1 truncate">{label}</span>
  </Link>
)

/** A remote peer row: offline devices are greyed + inert; clicking a live one shows a spinner and,
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
      <DeviceBadge label="P2P" />
      {state === "connecting" ? <Spinner className="relative size-4" /> : null}
      {state === "failed" ? (
        <Icon name="circle-warning" className="relative size-4 text-amber-500" />
      ) : null}
    </button>
  )
}

/**
 * The device-first Drive nav: everything lives under a device. The always-on cloud holds the Drive
 * views (My Drive/Recents/Favorites/Trash); this computer holds its synced folders (the 1:1 mirror);
 * P2P peers list below (transport not implemented yet, so none are shown — the row states are ready).
 */
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
  const { data: setup } = useQuery({ queryKey: ["setup-status"], queryFn: fetchSetupStatus })
  const cloudName = setup?.instanceName || t("driveNav.cloud")
  const syncedPaths = new Set(synced.map((folder) => `/drive/${folder.driveNodeId}`))
  const peers: P2pDevice[] = []

  return (
    <>
      <SectionLabel>{t("driveNav.devices")}</SectionLabel>

      <DeviceHeader icon="cloud" name={cloudName} badge={t("driveNav.tagCloud")} />
      <DeviceChild
        href="/drive/files"
        icon="folder"
        label={t("driveNav.myDrive")}
        active={isMyDrive(pathname) && !syncedPaths.has(pathname)}
      />
      <DeviceChild
        href="/drive/recent"
        icon="calendar"
        label={t("driveNav.recents")}
        active={pathname === "/drive/recent"}
      />
      <DeviceChild
        href="/drive/favorites"
        icon="favourites"
        label={t("driveNav.favorites")}
        active={pathname === "/drive/favorites"}
      />
      <DeviceChild
        href="/drive/trash"
        icon="trash"
        label={t("driveNav.trash")}
        active={pathname === "/drive/trash"}
      />

      {desktop ? (
        <>
          <DeviceHeader icon="laptop" name={localName} badge={t("driveNav.tagLocal")} />
          {synced.length > 0 ? (
            synced.map((folder) => (
              <DeviceChild
                key={folder.id}
                href={`/drive/${folder.driveNodeId}`}
                icon="folder"
                label={folder.name}
                active={pathname === `/drive/${folder.driveNodeId}`}
              />
            ))
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
