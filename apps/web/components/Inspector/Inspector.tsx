"use client"

import { type ReactNode, useState } from "react"
import { cn } from "@workspace/ui/lib/utils"

export interface InspectorTab {
  id: string
  /** Accessible label for the rail button (shown as the tooltip/aria-label). */
  label: string
  /** Rail glyph — any icon node, so callers aren't limited to the registry. */
  icon: ReactNode
  content: ReactNode
}

/** Shared tabbed inspector shell (Spacedrive-style rail): a row of icon tabs over a scrolling
 *  content area. Drive and Photos supply their own tabs; the chrome + tab state live here. The
 *  active tab persists across selections and falls back to the first when it no longer exists. */
const Inspector = ({ tabs }: { tabs: InspectorTab[] }) => {
  const [activeId, setActiveId] = useState<string | undefined>(undefined)
  const current = tabs.find((tab) => tab.id === activeId) ?? tabs[0]
  if (!current) return null

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {tabs.length > 1 ? (
        <div className="border-border/60 flex items-center gap-1 border-b px-2 py-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-label={tab.label}
              title={tab.label}
              aria-pressed={tab.id === current.id}
              onClick={() => setActiveId(tab.id)}
              className={cn(
                "flex size-8 items-center justify-center rounded-md transition",
                tab.id === current.id
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50",
              )}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      ) : null}
      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">{current.content}</div>
    </div>
  )
}

export default Inspector
