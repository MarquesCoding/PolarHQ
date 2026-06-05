"use client"

import { useState } from "react"
import { formatBytes } from "@lib/format"
import { Icon } from "@lib/icons"
import { type UploadItem, useUploadManager } from "@lib/uploadManager"
import { IconChevronDown, IconX } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { AnimatePresence, motion } from "motion/react"

const Ring = ({ value, indeterminate }: { value: number; indeterminate?: boolean }) => {
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

const statusText = (item: UploadItem): string => {
  if (item.kind === "task") {
    switch (item.status) {
      case "done":
        return "Done"
      case "error":
        return item.error ?? "Failed"
      default:
        return item.size > 0 ? `Archiving ${item.loaded} of ${item.size}` : "Archiving…"
    }
  }
  if (item.kind === "download") {
    switch (item.status) {
      case "done":
        return "Downloaded"
      case "error":
        return item.error ?? "Download failed"
      default:
        return item.size > 0
          ? `${formatBytes(item.loaded)} of ${formatBytes(item.size)}`
          : "Downloading…"
    }
  }
  switch (item.status) {
    case "uploading":
      return item.speed > 0 ? `${formatBytes(item.speed)}/s` : "Uploading…"
    case "processing":
      return item.mediaType === "video"
        ? "Transcoding…"
        : item.mediaType === "audio"
          ? "Processing…"
          : "Compressing…"
    case "done":
      return "Done"
    case "deduped":
      return "Already in library"
    case "error":
      return item.error ?? "Failed"
  }
}

const Row = ({ item, onRemove }: { item: UploadItem; onRemove: () => void }) => (
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
      <p className="text-muted-foreground text-xs">{statusText(item)}</p>
    </div>
    <Button variant="ghost" size="icon-sm" aria-label="Dismiss" onClick={onRemove}>
      <IconX className="size-3.5" />
    </Button>
  </motion.li>
)

const UploadPanel = () => {
  const { items, remove, clearFinished } = useUploadManager()
  const [collapsed, setCollapsed] = useState(false)

  const uploading = items.filter(
    (item) => item.kind === "upload" && item.status === "uploading",
  ).length
  const compressing = items.filter((item) => item.status === "processing").length
  const downloading = items.filter(
    (item) => item.kind === "download" && item.status === "uploading",
  ).length
  const archiving = items.filter(
    (item) => item.kind === "task" && item.status === "uploading",
  ).length
  const title =
    uploading > 0
      ? `Uploading ${uploading} item${uploading === 1 ? "" : "s"}`
      : compressing > 0
        ? `Processing ${compressing} item${compressing === 1 ? "" : "s"}`
        : downloading > 0
          ? `Downloading ${downloading} item${downloading === 1 ? "" : "s"}`
          : archiving > 0
            ? `Archiving ${archiving} item${archiving === 1 ? "" : "s"}`
            : "Activity"

  return (
    <AnimatePresence>
      {items.length > 0 ? (
        <motion.div
          key="upload-panel"
          className="panel text-card-foreground fixed right-4 bottom-4 z-40 w-80 overflow-hidden rounded-2xl shadow-xl"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <span className="text-sm font-medium">{title}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={clearFinished}>
                Clear
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={collapsed ? "Expand" : "Collapse"}
                onClick={() => setCollapsed((value) => !value)}
              >
                <IconChevronDown
                  className={cn("size-4 transition-transform", collapsed && "rotate-180")}
                />
              </Button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!collapsed ? (
              <motion.ul
                key="list"
                className="max-h-72 divide-y overflow-y-auto"
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
              >
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <Row key={item.id} item={item} onRemove={() => remove(item.id)} />
                  ))}
                </AnimatePresence>
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default UploadPanel
