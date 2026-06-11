"use client"

import { useMemo } from "react"
import { decryptNodeName, fetchStorageStats, type StorageApp } from "@lib/drive"
import { formatBytes } from "@lib/format"
import { Icon } from "@lib/icons"
import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import Spinner from "@components/Spinner/Spinner"
import { useTranslation } from "react-i18next"

interface StorageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const APP_META: Record<StorageApp, { color: string; icon: string }> = {
  photos: { color: "bg-blue-500", icon: "photo" },
  drive: { color: "bg-amber-500", icon: "folder" },
  docs: { color: "bg-indigo-500", icon: "file-text" },
  sheets: { color: "bg-emerald-500", icon: "table" },
  whiteboard: { color: "bg-pink-500", icon: "palette" },
}

const StorageDialog = ({ open, onOpenChange }: StorageDialogProps) => {
  const { t } = useTranslation("common")
  const { data, isLoading } = useQuery({
    queryKey: ["drive", "storage"],
    queryFn: fetchStorageStats,
    enabled: open,
  })

  const usedPct =
    data?.quotaBytes && data.quotaBytes > 0
      ? Math.min(100, (data.usedBytes / data.quotaBytes) * 100)
      : 0

  const largest = useMemo(
    () => (data?.largest ?? []).map((file) => ({ ...file, label: decryptNodeName(file).name })),
    [data?.largest],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-border border-b px-6 py-4">
          <DialogTitle>{t("storageDialog.title")}</DialogTitle>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="scrollbar-slim flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-semibold tabular-nums" dir="ltr">
                  {formatBytes(data.usedBytes)}
                </span>
                <span className="text-muted-foreground text-sm">
                  {data.quotaBytes
                    ? t("storageDialog.ofTotal", {
                        used: formatBytes(data.usedBytes),
                        total: formatBytes(data.quotaBytes),
                      })
                    : t("storageDialog.usedOnly", { used: formatBytes(data.usedBytes) })}
                </span>
              </div>
              <div className="bg-muted flex h-2.5 w-full overflow-hidden rounded-full" dir="ltr">
                {data.quotaBytes
                  ? data.breakdown.map((segment) => (
                      <div
                        key={segment.app}
                        className={APP_META[segment.app].color}
                        style={{ width: `${(segment.bytes / data.quotaBytes!) * 100}%` }}
                      />
                    ))
                  : data.breakdown.map((segment) => (
                      <div
                        key={segment.app}
                        className={APP_META[segment.app].color}
                        style={{
                          width: `${data.usedBytes > 0 ? (segment.bytes / data.usedBytes) * 100 : 0}%`,
                        }}
                      />
                    ))}
                <div className="bg-muted flex-1" style={{ width: `${100 - usedPct}%` }} />
              </div>
            </div>

            {data.breakdown.length > 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                  {t("storageDialog.byApp")}
                </p>
                <div className="flex flex-col gap-1">
                  {data.breakdown.map((segment) => (
                    <div key={segment.app} className="flex items-center gap-2.5 py-1 text-sm">
                      <span className={`size-2.5 shrink-0 rounded-full ${APP_META[segment.app].color}`} />
                      <span className="font-medium">{t(`apps.${segment.app}`)}</span>
                      <span className="text-muted-foreground">
                        {t(`storageDialog.files`, { count: segment.count })}
                      </span>
                      <span className="text-muted-foreground ms-auto tabular-nums" dir="ltr">
                        {formatBytes(segment.bytes)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {t("storageDialog.largest")}
              </p>
              {largest.length === 0 ? (
                <p className="text-muted-foreground py-2 text-sm">{t("storageDialog.noFiles")}</p>
              ) : (
                <div className="flex flex-col">
                  {largest.map((file) => (
                    <div
                      key={file.id}
                      className="border-border/50 flex items-center gap-3 border-b py-2 last:border-0"
                    >
                      <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
                        <Icon name={APP_META[file.app].icon} className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{file.label}</span>
                      <span className="text-muted-foreground shrink-0 text-sm tabular-nums" dir="ltr">
                        {formatBytes(file.sizeBytes)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default StorageDialog
