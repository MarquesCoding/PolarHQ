"use client"

import type { MouseEvent } from "react"
import { formatBytes } from "@lib/format"
import type { DocMeta } from "@lib/docs"
import { Icon } from "@lib/icons"
import { IconCircle, IconCircleCheckFilled } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "react-i18next"

interface DocCardProps {
  doc: DocMeta
  selected: boolean
  onOpen: (doc: DocMeta) => void
  onSelect: (doc: DocMeta, shiftKey: boolean, additive: boolean) => void
  onToggle: (doc: DocMeta) => void
  iconName?: string
}

const DocCard = ({ doc, selected, onOpen, onSelect, onToggle, iconName = "document" }: DocCardProps) => {
  const { t } = useTranslation("docs")

  return (
  <div
    data-doc-card={doc.id}
    onClick={(event: MouseEvent) => onSelect(doc, event.shiftKey, event.metaKey || event.ctrlKey)}
    onDoubleClick={() => onOpen(doc)}
    className={cn(
      "group relative flex cursor-pointer flex-col gap-2 rounded-xl p-2 transition",
      selected ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/40",
    )}
  >
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label={selected ? t("docCard.deselect") : t("docCard.select")}
      onClick={(event) => {
        event.stopPropagation()
        onToggle(doc)
      }}
      className={cn(
        "absolute top-3 left-3 z-10 size-6 rounded-full hover:bg-transparent",
        selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
      )}
    >
      {selected ? (
        <IconCircleCheckFilled className="text-primary bg-background size-5 rounded-full" />
      ) : (
        <IconCircle className="text-muted-foreground bg-background/70 size-5 rounded-full" />
      )}
    </Button>

    <div className="bg-card group-hover:border-primary/40 flex aspect-[4/5] items-center justify-center rounded-xl border transition">
      <Icon name={iconName} className="text-muted-foreground size-14" />
    </div>

    <div className="flex flex-col">
      <span
        className={cn(
          "max-w-full truncate rounded px-1 text-sm font-medium",
          selected && "bg-primary text-primary-foreground",
        )}
      >
        {doc.name}
      </span>
      <span className="text-muted-foreground px-1 text-xs">
        {new Date(doc.updatedAt).toLocaleDateString()} · {formatBytes(doc.sizeBytes ?? 0)}
      </span>
    </div>
  </div>
  )
}

export default DocCard
