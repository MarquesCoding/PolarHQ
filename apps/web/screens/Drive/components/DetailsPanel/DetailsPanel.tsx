"use client"

import { dateLocale } from "@lib/i18n/format"
import type { ReactNode } from "react"
import type { DriveNode } from "@lib/drive"
import { formatBytes } from "@lib/format"
import { Icon } from "@lib/icons"
import { IconX } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"

interface DetailsPanelProps {
  open: boolean
  nodes: DriveNode[]
  onClose: () => void
}

const ARCHIVE = /\.(zip|tar|gz|tgz|rar|7z|bz2|xz|dmg)$/i
const DATABASE = /\.(db|sqlite|sqlite3|sql)$/i

/** Map a node to one of the overview storage-kind keys, so the panel can show a friendly label
 *  (Images / Videos / …) reusing the existing `overview.kinds.*` strings. */
const storageKindKey = (node: DriveNode): string => {
  const mime = node.mimeType ?? ""
  const name = node.name.toLowerCase()
  if (mime.startsWith("image/")) return "image"
  if (mime.startsWith("video/")) return "video"
  if (mime.startsWith("audio/")) return "audio"
  if (
    mime === "application/pdf" ||
    /(word|presentation|spreadsheet|^text\/|vnd\.orbit|officedocument|oasis|msword|json)/.test(mime)
  )
    return "document"
  if (ARCHIVE.test(name) || /(zip|tar|gzip|x-7z|x-rar|x-bzip)/.test(mime)) return "archive"
  return "other"
}

/** Uppercase file extension for display, or undefined when the name has none. */
const extensionOf = (name: string): string | undefined => {
  const dot = name.lastIndexOf(".")
  if (dot <= 0 || dot === name.length - 1) return undefined
  return name.slice(dot + 1).toUpperCase()
}

const typeIcon = (node: DriveNode): { name: string; color: string } => {
  if (node.kind === "folder")
    return { name: node.special ? "folder-lock" : "folder", color: "text-blue-400" }
  const name = node.name.toLowerCase()
  const mime = node.mimeType ?? ""
  if (mime.startsWith("audio/")) return { name: "music", color: "text-emerald-400" }
  if (mime.startsWith("video/")) return { name: "video", color: "text-rose-400" }
  if (mime === "application/pdf" || name.endsWith(".pdf"))
    return { name: "file-pdf", color: "text-red-400" }
  if (ARCHIVE.test(name)) return { name: "file-zip", color: "text-muted-foreground" }
  if (DATABASE.test(name)) return { name: "database", color: "text-violet-400" }
  if (mime.startsWith("image/")) return { name: "photo", color: "text-sky-400" }
  return { name: "file-text", color: "text-muted-foreground" }
}

const Preview = ({ node }: { node: DriveNode }) => {
  const icon = typeIcon(node)
  return node.thumbnailUrl ? (
    <img src={node.thumbnailUrl} alt={node.name} className="h-full w-full object-cover" />
  ) : (
    <div className="bg-sidebar-accent/50 flex h-full w-full items-center justify-center">
      <Icon name={icon.name} className={cn("size-14", icon.color)} />
    </div>
  )
}

const Field = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-muted-foreground text-xs">{label}</dt>
    <dd className="text-sm break-words">{value}</dd>
  </div>
)

const SingleDetails = ({ node }: { node: DriveNode }) => {
  const { t } = useTranslation("drive")
  const extension = node.kind === "file" ? extensionOf(node.name) : undefined
  return (
    <>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="aspect-square w-full overflow-hidden rounded-xl">
          <Preview node={node} />
        </div>
        <p className="text-sm font-medium break-words">{node.name}</p>
      </div>
      <dl className="flex flex-col gap-3">
        <Field
          label={t("detailsPanel.kind")}
          value={
            node.kind === "folder"
              ? t("detailsPanel.folder")
              : t(`overview.kinds.${storageKindKey(node)}`)
          }
        />
        <Field
          label={t("detailsPanel.type")}
          value={node.kind === "folder" ? t("detailsPanel.folder") : (node.mimeType ?? t("detailsPanel.file"))}
        />
        {extension ? <Field label={t("detailsPanel.extension")} value={extension} /> : null}
        {node.kind === "file" ? (
          <Field label={t("detailsPanel.size")} value={formatBytes(node.sizeBytes ?? 0)} />
        ) : null}
        <Field label={t("detailsPanel.created")} value={new Date(node.createdAt).toLocaleString(dateLocale())} />
        <Field label={t("detailsPanel.modified")} value={new Date(node.updatedAt).toLocaleString(dateLocale())} />
      </dl>
    </>
  )
}

const StackedDetails = ({ nodes }: { nodes: DriveNode[] }) => {
  const { t } = useTranslation("drive")
  const folders = nodes.filter((node) => node.kind === "folder").length
  const files = nodes.length - folders
  const totalBytes = nodes.reduce((sum, node) => sum + (node.sizeBytes ?? 0), 0)
  return (
    <>
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative aspect-square w-full">
          {nodes.slice(0, 3).map((node, index) => (
            <div
              key={node.id}
              className="ring-popover absolute aspect-square w-[78%] overflow-hidden rounded-xl ring-4"
              style={{
                left: `${index * 11}%`,
                top: `${index * 11}%`,
                zIndex: 3 - index,
              }}
            >
              <Preview node={node} />
            </div>
          ))}
        </div>
        <p className="text-sm font-medium">{t("detailsPanel.itemsSelected", { count: nodes.length })}</p>
      </div>
      <dl className="flex flex-col gap-3">
        {files > 0 ? <Field label={t("detailsPanel.files")} value={String(files)} /> : null}
        {folders > 0 ? <Field label={t("detailsPanel.folders")} value={String(folders)} /> : null}
        <Field label={t("detailsPanel.totalSize")} value={formatBytes(totalBytes)} />
      </dl>
    </>
  )
}

/** Right-side details panel: follows the selection (single item, or a stacked summary). */
const DetailsPanel = ({ open, nodes, onClose }: DetailsPanelProps) => {
  const { t } = useTranslation("drive")
  return (
    <motion.aside
      initial={false}
      animate={{ width: open ? 288 : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{ borderLeftWidth: open ? undefined : 0 }}
      className="border-border/60 sticky top-0 h-[calc(100svh-4.5rem)] shrink-0 self-start overflow-hidden border-l"
    >
      <div className="flex h-full w-72 flex-col gap-5 overflow-y-auto p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">{t("detailsPanel.title")}</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("detailsPanel.closeDetails")}
            onClick={onClose}
          >
            <IconX className="size-4" />
          </Button>
        </div>

        {nodes.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("detailsPanel.empty")}</p>
        ) : nodes.length === 1 ? (
          <SingleDetails node={nodes[0]!} />
        ) : (
          <StackedDetails nodes={nodes} />
        )}
      </div>
    </motion.aside>
  )
}

export default DetailsPanel
