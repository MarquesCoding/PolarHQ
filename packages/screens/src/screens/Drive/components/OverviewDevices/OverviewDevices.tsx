import { useEffect, useRef, useState } from "react"
import { getHost } from "@workspace/core/host"
import { formatBytes } from "@workspace/core/format"
import { AppLink as Link } from "@workspace/screens/platform"
import { getSyncBridge } from "@workspace/screens/syncBridge"
import { Icon } from "@workspace/screens/icons"
import Spinner from "@components/Spinner/Spinner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import type { ReactNode } from "react"

interface P2pDevice {
  id: string
  name: string
  icon: string
  online: boolean
}

const CONNECT_TIMEOUT_MS = 15000

type DeviceStatus = "online" | "offline" | "connecting" | "failed"

const StatusDot = ({ status }: { status: DeviceStatus }) => {
  if (status === "connecting") return <Spinner className="size-3.5" />
  if (status === "failed")
    return <Icon name="circle-warning" className="size-3.5 text-amber-500" />
  return (
    <span
      className={cn(
        "size-2 rounded-full",
        status === "online" ? "bg-emerald-500 dark:bg-emerald-400" : "bg-muted-foreground/40",
      )}
    />
  )
}

const StatusLabel: Record<DeviceStatus, string> = {
  online: "online",
  offline: "offline",
  connecting: "connecting",
  failed: "connectFailed",
}

const DEVICE_ACCENT = {
  cloud: "bg-blue-500/12 text-blue-600 dark:text-blue-400",
  local: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  peer: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
} as const

interface DeviceCardProps {
  icon: string
  accent: keyof typeof DEVICE_ACCENT
  name: string
  badge: string
  meta: string
  status: DeviceStatus
  action?: ReactNode
  children?: ReactNode
}

const DeviceCard = ({ icon, accent, name, badge, meta, status, action, children }: DeviceCardProps) => {
  const { t } = useTranslation("drive")
  return (
    <div className="panel flex flex-col gap-3 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            DEVICE_ACCENT[accent],
          )}
        >
          <Icon name={icon} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{name}</span>
            <Badge variant="secondary" className="text-[9px] tracking-wider uppercase">
              {badge}
            </Badge>
          </div>
          <span className="text-muted-foreground truncate text-xs" dir="ltr">
            {meta}
          </span>
        </div>
        {action ?? (
          <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
            <StatusDot status={status} />
            {t(`overview.${StatusLabel[status]}`)}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

const PeerCard = ({ device }: { device: P2pDevice }) => {
  const { t } = useTranslation("drive")
  const [state, setState] = useState<"idle" | "connecting" | "failed">("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const connect = () => {
    if (!device.online || state === "connecting") return
    setState("connecting")
    timer.current = setTimeout(() => setState("failed"), CONNECT_TIMEOUT_MS)
  }
  const status: DeviceStatus = !device.online
    ? "offline"
    : state === "connecting"
      ? "connecting"
      : state === "failed"
        ? "failed"
        : "online"
  return (
    <DeviceCard
      icon={device.icon}
      accent="peer"
      name={device.name}
      badge={t("overview.tagP2p")}
      meta={t(`overview.${StatusLabel[status]}`)}
      status={status}
      action={
        device.online ? (
          <Button variant="outline" size="sm" onClick={connect} disabled={state === "connecting"}>
            {state === "connecting" ? (
              <Spinner className="size-4" />
            ) : (
              t(state === "failed" ? "overview.retry" : "overview.connect")
            )}
          </Button>
        ) : undefined
      }
    />
  )
}

const OverviewDevices = ({ cloudBytes, cloudFiles }: { cloudBytes: number; cloudFiles: number }) => {
  const { t } = useTranslation("drive")
  const bridge = getSyncBridge()
  const host = getHost()
  const desktop = host.isDesktop
  const localName = host.deviceName || t("overview.thisDevice")

  const { data: synced = [] } = useQuery({
    queryKey: ["sync", "folders"],
    queryFn: () => bridge!.list(),
    enabled: Boolean(bridge),
  })
  const peers: P2pDevice[] = []

  return (
    <div className="grid items-start gap-3 sm:grid-cols-2">
      <DeviceCard
        icon="cloud"
        accent="cloud"
        name={t("overview.cloud")}
        badge={t("overview.tagCloud")}
        meta={t("overview.cloudMeta", {
          files: t("overview.files", { count: cloudFiles }),
          size: formatBytes(cloudBytes),
        })}
        status="online"
      />

      {desktop ? (
        <DeviceCard
          icon="laptop"
          accent="local"
          name={localName}
          badge={t("overview.tagLocal")}
          meta={t("overview.syncedFolders", { count: synced.length })}
          status="online"
        >
          {synced.length > 0 ? (
            <div className="flex flex-col">
              {synced.map((folder) => (
                <Link
                  key={folder.id}
                  href={`/drive/${folder.driveNodeId}`}
                  className="hover:bg-muted/60 border-border/40 -mx-1 flex items-center gap-2.5 rounded-lg border-t px-2 py-2 text-sm transition-colors first:border-t-0"
                >
                  <Icon name="folder" className="text-muted-foreground size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {t("overview.files", { count: folder.fileCount })}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground border-border/40 border-t pt-3 text-xs">
              {t("overview.noSyncedFolders")}
            </p>
          )}
        </DeviceCard>
      ) : null}

      {peers.length > 0 ? (
        peers.map((device) => <PeerCard key={device.id} device={device} />)
      ) : (
        <div className="border-border/70 text-muted-foreground flex items-center gap-3 rounded-2xl border border-dashed p-4 text-xs sm:col-span-2">
          <Icon name="users-group" className="size-4 shrink-0" />
          <span>{desktop ? t("overview.discovering") : t("overview.webDeviceHint")}</span>
        </div>
      )}
    </div>
  )
}

export default OverviewDevices
