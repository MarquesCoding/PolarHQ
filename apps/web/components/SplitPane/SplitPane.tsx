"use client"

import type { SplitApp } from "@lib/splitView"
import { IconX } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"

interface SplitPaneProps {
  app: SplitApp
  onClose: () => void
  /** Disable iframe pointer events while a drag is in progress so drops reach the shell. */
  inert?: boolean
}

/** A secondary app shown beside the current one, loaded seamlessly as an embedded iframe. */
const SplitPane = ({ app, onClose, inert }: SplitPaneProps) => (
  <div className="group relative flex min-w-0 flex-1">
    <iframe
      src={app.route}
      title={app.name}
      className="h-full w-full border-0"
      style={inert ? { pointerEvents: "none" } : undefined}
    />
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Close ${app.name}`}
      onClick={onClose}
      className="bg-background/70 absolute top-3 right-3 z-40 rounded-full opacity-0 shadow-sm backdrop-blur transition group-hover:opacity-100"
    >
      <IconX className="size-4" />
    </Button>
  </div>
)

export default SplitPane
