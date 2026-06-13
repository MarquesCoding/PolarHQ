"use client"

import { authClient } from "@polarhq/sdk/authClient"
import { type StorageKind, decryptNodeName, fetchStorageStats } from "@lib/drive"
import { bytesParts, formatBytes } from "@polarhq/core/format"
import { Icon } from "@lib/icons"
import { squarify } from "@polarhq/core/treemap"
import { IconDevices } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
import type { StorageApp, StorageStats } from "@lib/drive"

const KIND_COLOR: Record<StorageKind, string> = {
  image: "bg-blue-500",
  video: "bg-violet-500",
  audio: "bg-teal-500",
  document: "bg-indigo-500",
  archive: "bg-amber-500",
  other: "bg-slate-400",
}

const APP_META: Record<StorageApp, { color: string; icon: string }> = {
  photos: { color: "bg-blue-500", icon: "photo" },
  drive: { color: "bg-amber-500", icon: "folder" },
  docs: { color: "bg-indigo-500", icon: "file-text" },
  sheets: { color: "bg-emerald-500", icon: "table" },
  whiteboard: { color: "bg-pink-500", icon: "palette" },
}

/** Bold section heading with a small count chip. */
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

const Badge = ({ children }: { children: string }) => (
  <span className="bg-muted text-muted-foreground w-fit rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
    {children}
  </span>
)

/** Circular storage gauge with the used amount in the centre (the hero of the overview). */
const StorageRing = ({ used, quota }: { used: number; quota: number | null }) => {
  const size = 120
  const stroke = 9
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
        <span className="text-2xl leading-none font-semibold tabular-nums">
          {parts.value.toFixed(parts.decimals)}
        </span>
        <span className="text-muted-foreground text-xs">{parts.unit}</span>
      </div>
    </div>
  )
}

const SPACE_MAP_RECT = { x: 0, y: 0, w: 2, h: 1 }

/** Squarified treemap of the largest files: rectangle area is proportional to bytes, colour to the
 *  owning app. A visual companion to the bar/legend above — "what is eating my storage". */
const StorageTreemap = ({ files }: { files: StorageStats["largest"] }) => {
  const tiles = squarify(
    files.map((file) => ({ value: file.sizeBytes, file })),
    SPACE_MAP_RECT,
  )
  return (
    <div className="bg-muted relative aspect-[2/1] w-full overflow-hidden rounded-xl" dir="ltr">
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
  const workspaceName = session?.user?.name ?? t("overview.yourLibrary")

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-6">
      <section>
        <SectionHeader title={t("overview.storage")} />
        <div className="panel flex flex-col gap-4 rounded-xl p-5 sm:flex-row sm:items-center sm:gap-6">
          <StorageRing used={used} quota={quota} />
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-base font-semibold">{workspaceName}</span>
            <span className="text-muted-foreground text-sm" dir="ltr">
              {quota != null
                ? t("overview.freeOf", { free: formatBytes(free ?? 0), total: formatBytes(quota) })
                : t("overview.usedUnlimited", { used: formatBytes(used) })}
            </span>
            <span className="text-muted-foreground text-xs">
              {t("overview.files", { count: totalFiles })}
            </span>
            <div className="mt-1">
              <Badge>{t("overview.e2eBadge")}</Badge>
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title={t("overview.devices")} />
        <div className="border-border/70 flex items-center gap-4 rounded-xl border border-dashed p-5">
          <span className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-xl">
            <IconDevices className="text-muted-foreground size-6" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium">{t("overview.p2pSync")}</span>
            <span className="text-muted-foreground text-xs">{t("overview.comingSoon")}</span>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title={t("overview.apps")} count={data?.breakdown.length} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {(data?.breakdown ?? []).map((app) => (
            <div key={app.app} className="panel flex flex-col gap-2 rounded-xl p-4">
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
        <SectionHeader title={t("overview.byKind")} />
        <div className="panel rounded-xl p-4">
          <div className="bg-muted mb-4 flex h-3 w-full overflow-hidden rounded-full" dir="ltr">
            {(data?.kinds ?? []).map((kind, index) => (
              <motion.div
                key={kind.kind}
                className={KIND_COLOR[kind.kind]}
                initial={{ width: "0%" }}
                animate={{ width: `${(kind.bytes / denom) * 100}%` }}
                transition={{ duration: 0.5, delay: index * 0.06, ease: [0.32, 0.72, 0, 1] }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {(data?.kinds ?? []).map((kind) => (
              <div key={kind.kind} className="flex items-center gap-2.5 text-sm">
                <span className={`size-2.5 shrink-0 rounded-full ${KIND_COLOR[kind.kind]}`} />
                <span className="font-medium">{t(`overview.kinds.${kind.kind}`)}</span>
                <span className="text-muted-foreground">
                  {t("overview.files", { count: kind.count })}
                </span>
                <div className="bg-muted relative mx-2 hidden h-1.5 flex-1 overflow-hidden rounded-full sm:block">
                  <div
                    className={`absolute inset-y-0 left-0 ${KIND_COLOR[kind.kind]}`}
                    style={{ width: `${used > 0 ? (kind.bytes / used) * 100 : 0}%` }}
                  />
                </div>
                <span
                  className="text-muted-foreground ms-auto shrink-0 tabular-nums sm:ms-0"
                  dir="ltr"
                >
                  {formatBytes(kind.bytes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title={t("overview.largest")} />
        {(data?.largest ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("overview.noFiles")}</p>
        ) : (
          <div className="panel flex flex-col rounded-xl px-3">
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
