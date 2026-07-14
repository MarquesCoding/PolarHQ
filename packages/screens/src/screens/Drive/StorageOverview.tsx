import { authClient } from "@workspace/core/authClient"
import { type StorageKind, decryptNodeName, fetchStorageStats } from "@workspace/core/drive"
import { bytesParts, formatBytes } from "@workspace/core/format"
import { Icon } from "@workspace/screens/icons"
import { squarify } from "@workspace/screens/treemap"
import OverviewDevices from "@pages/Drive/components/OverviewDevices/OverviewDevices"
import { Badge } from "@workspace/ui/components/badge"
import { useQuery } from "@tanstack/react-query"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
import type { StorageApp, StorageStats } from "@workspace/core/drive"

const SLOT = {
  blue: "bg-blue-500",
  green: "bg-emerald-500 dark:bg-emerald-600",
  amber: "bg-amber-500 dark:bg-amber-600",
  violet: "bg-violet-500",
  rose: "bg-rose-500",
  neutral: "bg-slate-400 dark:bg-slate-500",
} as const

const KIND_COLOR: Record<StorageKind, string> = {
  image: SLOT.blue,
  video: SLOT.violet,
  audio: SLOT.green,
  document: SLOT.amber,
  archive: SLOT.rose,
  other: SLOT.neutral,
}

const APP_META: Record<StorageApp, { color: string; icon: string }> = {
  photos: { color: SLOT.blue, icon: "photo" },
  drive: { color: SLOT.amber, icon: "folder" },
  docs: { color: SLOT.violet, icon: "file-text" },
  sheets: { color: SLOT.green, icon: "table" },
  whiteboard: { color: SLOT.rose, icon: "palette" },
}

const SectionHeader = ({ title, count }: { title: string; count?: number }) => (
  <div className="mb-3 flex items-center gap-2">
    <h2 className="text-base font-semibold">{title}</h2>
    {count !== undefined ? (
      <span className="bg-muted text-muted-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums">
        {count}
      </span>
    ) : null}
  </div>
)

const StorageRing = ({ used, quota }: { used: number; quota: number | null }) => {
  const size = 132
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = quota && quota > 0 ? Math.min(1, used / quota) : 0
  const parts = bytesParts(used)
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - fraction) }}
          transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" dir="ltr">
        <span className="text-[1.75rem] leading-none font-semibold tabular-nums">
          {parts.value.toFixed(parts.decimals)}
        </span>
        <span className="text-muted-foreground text-xs">{parts.unit}</span>
      </div>
    </div>
  )
}

const KindComposition = ({
  kinds,
  denom,
}: {
  kinds: StorageStats["kinds"]
  denom: number
}) => {
  const { t } = useTranslation("drive")
  const shown = kinds.filter((kind) => kind.bytes > 0)
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <span className="text-muted-foreground text-xs font-medium">{t("overview.composition")}</span>
      <div className="bg-muted flex h-3.5 w-full gap-[2px] overflow-hidden rounded-full" dir="ltr">
        {shown.map((kind, index) => (
          <motion.div
            key={kind.kind}
            className={`h-full first:rounded-l-full last:rounded-r-full ${KIND_COLOR[kind.kind]}`}
            initial={{ width: "0%" }}
            animate={{ width: `${(kind.bytes / denom) * 100}%` }}
            transition={{ duration: 0.5, delay: index * 0.06, ease: [0.32, 0.72, 0, 1] }}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-5 gap-y-2.5 sm:grid-cols-3">
        {shown.map((kind) => (
          <div key={kind.kind} className="flex min-w-0 items-center gap-2 text-sm">
            <span className={`size-2.5 shrink-0 rounded-full ${KIND_COLOR[kind.kind]}`} />
            <span className="min-w-0 flex-1 truncate">{t(`overview.kinds.${kind.kind}`)}</span>
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums" dir="ltr">
              {formatBytes(kind.bytes)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const SPACE_MAP_RECT = { x: 0, y: 0, w: 2, h: 1 }

const StorageTreemap = ({ files }: { files: StorageStats["largest"] }) => {
  const tiles = squarify(
    files.map((file) => ({ value: file.sizeBytes, file })),
    SPACE_MAP_RECT,
  )
  return (
    <div className="bg-muted relative aspect-[2/1] w-full overflow-hidden rounded-2xl" dir="ltr">
      {tiles.map(({ item, x, y, w, h }) => {
        const widthPct = (w / SPACE_MAP_RECT.w) * 100
        const heightPct = (h / SPACE_MAP_RECT.h) * 100
        const name = decryptNodeName(item.file).name
        return (
          <div
            key={item.file.id}
            className={`border-background absolute flex flex-col justify-end overflow-hidden border-2 p-1.5 text-white ${APP_META[item.file.app].color}`}
            style={{
              left: `${(x / SPACE_MAP_RECT.w) * 100}%`,
              top: `${(y / SPACE_MAP_RECT.h) * 100}%`,
              width: `${widthPct}%`,
              height: `${heightPct}%`,
            }}
            title={`${name} · ${formatBytes(item.file.sizeBytes)}`}
          >
            {widthPct > 13 && heightPct > 16 ? (
              <>
                <span className="truncate text-xs leading-tight font-medium">{name}</span>
                <span className="text-[10px] tabular-nums opacity-90">
                  {formatBytes(item.file.sizeBytes)}
                </span>
              </>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

const StorageOverview = () => {
  const { t } = useTranslation("drive")
  const { data: session } = authClient.useSession()
  const { data } = useQuery({
    queryKey: ["drive", "storage"],
    queryFn: fetchStorageStats,
    staleTime: 0,
    refetchOnMount: "always",
  })
  const used = data?.usedBytes ?? 0
  const quota = data?.quotaBytes ?? null
  const free = quota != null ? Math.max(0, quota - used) : null
  const totalFiles = data?.kinds.reduce((sum, k) => sum + k.count, 0) ?? 0
  const denom = quota && quota > 0 ? quota : Math.max(used, 1)
  const percent = quota && quota > 0 ? Math.round((used / quota) * 100) : null
  const workspaceName = session?.user?.name ?? t("overview.yourLibrary")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-9 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("overview.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("overview.subtitle")}</p>
      </header>

      <section className="panel flex flex-col gap-6 rounded-2xl p-6 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex items-center gap-5">
          <StorageRing used={used} quota={quota} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="truncate text-base font-semibold">{workspaceName}</span>
            <span className="text-muted-foreground text-sm" dir="ltr">
              {quota != null
                ? t("overview.usedOf", { used: formatBytes(used), total: formatBytes(quota) })
                : t("overview.unlimitedStorage")}
            </span>
            <span className="text-muted-foreground text-xs">
              {t("overview.files", { count: totalFiles })}
              {percent != null ? ` · ${percent}%` : null}
            </span>
            <Badge variant="secondary" className="mt-1 gap-1 text-[10px]">
              <Icon name="shield-lock" className="size-3" />
              {t("overview.encrypted")}
            </Badge>
          </div>
        </div>
        {data && data.kinds.some((kind) => kind.bytes > 0) ? (
          <>
            <div className="bg-border/60 hidden w-px self-stretch lg:block" />
            <KindComposition kinds={data.kinds} denom={denom} />
          </>
        ) : null}
      </section>

      <section>
        <SectionHeader title={t("overview.devices")} />
        <p className="text-muted-foreground -mt-2 mb-3 text-xs">{t("overview.devicesHint")}</p>
        <OverviewDevices cloudBytes={used} cloudFiles={totalFiles} />
      </section>

      <section>
        <SectionHeader title={t("overview.apps")} count={data?.breakdown.length} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {(data?.breakdown ?? []).map((app) => (
            <div key={app.app} className="panel flex flex-col gap-2 rounded-2xl p-4">
              <span
                className={`flex size-10 items-center justify-center rounded-xl text-white ${APP_META[app.app].color}`}
              >
                <Icon name={APP_META[app.app].icon} className="size-5" />
              </span>
              <span className="text-sm font-medium">{t(`apps.${app.app}`, { ns: "common" })}</span>
              <span className="text-muted-foreground text-xs tabular-nums" dir="ltr">
                {formatBytes(app.bytes)}
              </span>
              <span className="text-muted-foreground text-xs">
                {t("overview.files", { count: app.count })}
              </span>
            </div>
          ))}
        </div>
      </section>

      {data && data.largest.length >= 2 ? (
        <section>
          <SectionHeader title={t("overview.spaceMap")} />
          <p className="text-muted-foreground -mt-2 mb-3 text-xs">{t("overview.spaceMapHint")}</p>
          <StorageTreemap files={data.largest} />
        </section>
      ) : null}

      <section>
        <SectionHeader title={t("overview.largest")} />
        {(data?.largest ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("overview.noFiles")}</p>
        ) : (
          <div className="panel flex flex-col rounded-2xl px-3">
            {(data?.largest ?? []).slice(0, 8).map((file) => (
              <div
                key={file.id}
                className="border-border/50 flex items-center gap-3 border-b py-2.5 last:border-0"
              >
                <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
                  <Icon name={APP_META[file.app].icon} className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{decryptNodeName(file).name}</span>
                <span className="text-muted-foreground shrink-0 text-sm tabular-nums" dir="ltr">
                  {formatBytes(file.sizeBytes)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default StorageOverview
