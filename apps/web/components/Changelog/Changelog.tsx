"use client"

import { dateLocale } from "@lib/i18n/format"
import type { ReactNode } from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { type Release, RELEASES } from "@workspace/changelog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"

const renderInline = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return (
        <strong key={i} className="text-foreground font-medium">
          {part.slice(2, -2)}
        </strong>
      )
    if (part.startsWith("`") && part.endsWith("`"))
      return (
        <code key={i} className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    return part
  })

const renderMarkdown = (content: string): ReactNode[] => {
  const blocks: ReactNode[] = []
  let list: ReactNode[] = []
  const flush = () => {
    if (list.length > 0) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="ml-4 flex list-disc flex-col gap-1">
          {list}
        </ul>,
      )
      list = []
    }
  }
  content.split("\n").forEach((line, i) => {
    if (line.startsWith("### ")) {
      flush()
      blocks.push(
        <h4 key={i} className="text-foreground mt-3 text-xs font-semibold tracking-wide uppercase">
          {renderInline(line.slice(4))}
        </h4>,
      )
    } else if (line.startsWith("- ")) {
      list.push(<li key={i}>{renderInline(line.slice(2))}</li>)
    } else if (line.trim() === "") {
      flush()
    } else {
      flush()
      blocks.push(
        <p key={i} className="mt-1">
          {renderInline(line)}
        </p>,
      )
    }
  })
  flush()
  return blocks
}

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString(dateLocale(), { year: "numeric", month: "short", day: "numeric" })

const ReleaseEntry = ({ release }: { release: Release }) => (
  <section className="border-border border-b pb-6 last:border-0 last:pb-0">
    <div className="mb-1 flex items-center gap-2">
      <Badge>v{release.version}</Badge>
      <span className="text-muted-foreground text-xs">{formatDate(release.date)}</span>
    </div>
    {release.title ? <h3 className="text-base font-semibold">{release.title}</h3> : null}
    {release.tags && release.tags.length > 0 ? (
      <div className="mt-1.5 mb-2 flex flex-wrap gap-1">
        {release.tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </div>
    ) : null}
    <div className="text-muted-foreground text-sm leading-relaxed">
      {renderMarkdown(release.content)}
    </div>
  </section>
)

/** Clickable app-version footer that opens an in-app "What's new" changelog. */
const Changelog = ({ version, build }: { version: string; build: string }) => {
  const { t } = useTranslation("common")
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="link"
            className="text-muted-foreground/60 hover:text-muted-foreground h-auto p-0 font-mono text-[10px] font-normal tracking-tight"
          >
            {t("changelog.versionBuild", { version, build })}
          </Button>
        }
      />
      <DialogContent className="flex max-h-[85vh] w-full max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-border border-b px-6 py-4">
          <DialogTitle>{t("changelog.whatsNew")}</DialogTitle>
        </DialogHeader>
        <div className="scrollbar-slim flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          {RELEASES.map((release) => (
            <ReleaseEntry key={release.version} release={release} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default Changelog
