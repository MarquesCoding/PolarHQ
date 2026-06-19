"use client"

import { dateLocale } from "@lib/i18n/format"
import type { ComponentType, ReactNode } from "react"
import type { DriveNode } from "@lib/drive"
import { bytesParts } from "@lib/format"
import { ArrowSquareOut, Calendar, File, HeartIcon } from "@phosphor-icons/react"
import NumberFlow from "@number-flow/react"
import { Button } from "@workspace/ui/components/button"
import { useTranslation } from "react-i18next"

const ARCHIVE = /\.(zip|tar|gz|tgz|rar|7z|bz2|xz|dmg)$/i

/** Map a node to one of the overview storage-kind keys for a friendly label (Images / Videos / …). */
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

const extensionOf = (name: string): string | undefined => {
  const dot = name.lastIndexOf(".")
  if (dot <= 0 || dot === name.length - 1) return undefined
  return name.slice(dot + 1).toUpperCase()
}

const Row = ({ label, value }: { label: string; value?: ReactNode }) =>
  value ? (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground/90 text-right break-words">{value}</span>
    </div>
  ) : null

const Section = ({
  icon: IconCmp,
  title,
  children,
}: {
  icon: ComponentType<{ className?: string }>
  title: string
  children: ReactNode
}) => (
  <div className="flex flex-col">
    <div className="text-muted-foreground flex items-center gap-2 pb-1 text-xs font-semibold tracking-wide uppercase">
      <IconCmp className="size-4" />
      {title}
    </div>
    <div className="border-border/60 flex flex-col border-t pt-1">{children}</div>
  </div>
)

interface DriveInfoPanelProps {
  node: DriveNode
  onFavorite?: () => void
  onShare?: () => void
}

/** Drive file details for the Lightbox side panel — mirrors the Photos InfoPanel layout. */
const DriveInfoPanel = ({ node, onFavorite, onShare }: DriveInfoPanelProps) => {
  const { t } = useTranslation("drive")
  const kindLabel = t(`overview.kinds.${storageKindKey(node)}`)
  const sizeParts = bytesParts(node.sizeBytes ?? 0)
  const extension = extensionOf(node.name)

  return (
    <div className="flex h-full w-full flex-col">
      <div className="border-border/60 flex items-start justify-between gap-3 border-b p-5">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] leading-tight font-semibold">{node.name}</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {kindLabel} · {sizeParts.value} {sizeParts.unit}
          </p>
        </div>
        {onFavorite || onShare ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {onFavorite ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("detailsPanel.favorite")}
                onClick={onFavorite}
                className="rounded-full"
              >
                <HeartIcon weight={node.favorite ? "fill" : "regular"} className="size-[18px]" />
              </Button>
            ) : null}
            {onShare ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("detailsPanel.share")}
                onClick={onShare}
                className="rounded-full"
              >
                <ArrowSquareOut className="size-[18px]" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="scrollbar-slim flex flex-1 flex-col gap-5 overflow-y-auto p-5">
        <Section icon={File} title={t("detailsPanel.file")}>
          <Row label={t("detailsPanel.kind")} value={kindLabel} />
          <Row label={t("detailsPanel.type")} value={node.mimeType ?? t("detailsPanel.file")} />
          {extension ? <Row label={t("detailsPanel.extension")} value={extension} /> : null}
          <Row
            label={t("detailsPanel.size")}
            value={
              <NumberFlow
                value={sizeParts.value}
                suffix={` ${sizeParts.unit}`}
                format={{ maximumFractionDigits: sizeParts.decimals }}
              />
            }
          />
        </Section>

        <Section icon={Calendar} title={t("detailsPanel.dates")}>
          <Row
            label={t("detailsPanel.created")}
            value={new Date(node.createdAt).toLocaleString(dateLocale())}
          />
          <Row
            label={t("detailsPanel.modified")}
            value={new Date(node.updatedAt).toLocaleString(dateLocale())}
          />
        </Section>
      </div>
    </div>
  )
}

export default DriveInfoPanel
