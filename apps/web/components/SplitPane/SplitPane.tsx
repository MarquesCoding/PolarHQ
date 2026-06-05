"use client"

import { Icon } from "@lib/icons"
import type { SplitApp } from "@lib/splitView"
import { IconX } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"

interface SplitPaneProps {
  app: SplitApp
  onClose: () => void
  /** Disable iframe pointer events while a drag is in progress so drops reach the shell. */
  inert?: boolean
}

/** A secondary app shown beside the current one, loaded as an embedded iframe. */
const SplitPane = ({ app, onClose, inert }: SplitPaneProps) => (
  <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl">
    <header className="border-border/60 flex h-9 shrink-0 items-center justify-between border-b px-2.5">
      <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
        <Icon name={app.icon} className="size-4 shrink-0" />
        <span className="truncate">{app.name}</span>
      </div>
      <Button variant="ghost" size="icon-xs" aria-label={`Close ${app.name}`} onClick={onClose}>
        <IconX className="size-4" />
      </Button>
    </header>
    <iframe
      src={app.route}
      title={app.name}
      className="min-h-0 w-full flex-1 border-0"
      style={inert ? { pointerEvents: "none" } : undefined}
    />
  </div>
)

export default SplitPane
