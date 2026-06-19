"use client"

import { formatBytes } from "@lib/format"
import { Icon } from "@lib/icons"
import { t } from "@workspace/i18n/config"
import type { UploadItem } from "@lib/uploadManager"
import { ArrowClockwise, X } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"

/** A small SVG progress ring; spins when the work has no measurable percentage. */
export const Ring = ({ value, indeterminate }: { value: number; indeterminate?: boolean }) => {
  const size = 22
  const stroke = 2.5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const percent = indeterminate ? 0.25 : Math.max(0, Math.min(1, value))
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn(indeterminate && "animate-spin")}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        className="stroke-muted-foreground/20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeLinecap="round"
        className="stroke-primary"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - percent)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

const formatEta = (seconds: number): string =>
  seconds < 60
    ? t("common:uploadPanel.etaSeconds", { seconds: Math.ceil(seconds) })
    : t("common:uploadPanel.etaMinutes", { minutes: Math.ceil(seconds / 60) })

const progressText = (item: UploadItem, fallback: string): string => {
  if (item.size > 0 && item.loaded > 0) {
    const percent = Math.min(100, Math.round((item.loaded / item.size) * 100))
    const parts = [t("common:uploadPanel.percentDone", { percent })]
    if (item.speed > 0) {
      parts.push(t("common:uploadPanel.speed", { speed: formatBytes(item.speed) }))
      const remaining = item.size - item.loaded
      if (remaining > 0) parts.push(formatEta(remaining / item.speed))
    }
    return parts.join(" · ")
  }
  return item.speed > 0
    ? t("common:uploadPanel.speed", { speed: formatBytes(item.speed) })
    : fallback
}

/** Human status line for a job, varying by its kind (upload / download / task) and status. */
export const jobStatusText = (item: UploadItem): string => {
  if (item.kind === "task") {
    switch (item.status) {
      case "done":
        return t("common:uploadPanel.done")
      case "error":
        return item.error ?? t("common:uploadPanel.failed")
      default:
        return item.size > 0
          ? t("common:uploadPanel.archivingProgress", { loaded: item.loaded, size: item.size })
          : t("common:uploadPanel.archiving")
    }
  }
  if (item.kind === "download") {
    switch (item.status) {
      case "done":
        return t("common:uploadPanel.downloaded")
      case "error":
        return item.error ?? t("common:uploadPanel.downloadFailed")
      default:
        return progressText(item, t("common:uploadPanel.downloading"))
    }
  }
  switch (item.status) {
    case "uploading":
      return progressText(item, t("common:uploadPanel.uploading"))
    case "processing":
      return item.mediaType === "video"
        ? t("common:uploadPanel.transcoding")
        : item.mediaType === "audio"
          ? t("common:uploadPanel.processing")
          : t("common:uploadPanel.compressing")
    case "done":
      return t("common:uploadPanel.done")
    case "deduped":
      return t("common:uploadPanel.alreadyInLibrary")
    case "error":
      return item.error ?? t("common:uploadPanel.failed")
  }
}

/** One job row: a status glyph (or progress ring), name + status line, a retry button for failed
 *  retriable jobs, and a dismiss button. */
export const JobRow = ({
  item,
  onRemove,
  onRetry,
}: {
  item: UploadItem
  onRemove: () => void
  onRetry?: () => void
}) => (
  <motion.li
    layout
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
    exit={{ opacity: 0, height: 0 }}
    className="flex items-center gap-3 px-3 py-2"
  >
    <span className="flex size-6 shrink-0 items-center justify-center">
      {item.status === "done" ? (
        <Icon name="circle-check" className="text-primary size-5" />
      ) : item.status === "deduped" ? (
        <Icon name="duplicate" className="text-muted-foreground size-5" />
      ) : item.status === "error" ? (
        <Icon name="circle-warning" className="text-destructive size-5" />
      ) : (
        <Ring
          value={item.size > 0 ? item.loaded / item.size : 0}
          indeterminate={
            item.status === "processing" ||
            ((item.kind === "download" || item.kind === "task") &&
              item.status === "uploading" &&
              item.size === 0)
          }
        />
      )}
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm">{item.name}</p>
      <p className="text-muted-foreground text-xs">{jobStatusText(item)}</p>
    </div>
    {onRetry && item.status === "error" && item.retriable ? (
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("common:uploadPanel.retry")}
        onClick={onRetry}
      >
        <ArrowClockwise className="size-3.5" />
      </Button>
    ) : null}
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={t("common:uploadPanel.dismiss")}
      onClick={onRemove}
    >
      <X className="size-3.5" />
    </Button>
  </motion.li>
)
