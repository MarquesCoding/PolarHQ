"use client"

import { type ReactNode, useState } from "react"
import { Icon } from "@workspace/ui/components/icon"
import { Button } from "@workspace/ui/components/button"

const toggleIconFor = (collapsed: boolean, hovered: boolean): string => {
  if (collapsed) return hovered ? "sidebar-left-2-show" : "layout-left"
  return hovered ? "tile-to-left" : "window-left"
}

interface SuiteTitleBarProps {
  collapsed?: boolean
  onToggleSidebar?: () => void
  extra?: ReactNode
}

/** Shared flat top bar (frosted, edge-to-edge) mirroring the desktop FlatTopBar: a sidebar toggle
 *  on the left and app controls on the right, floating over content that scrolls beneath it. */
const SuiteTitleBar = ({ collapsed = false, onToggleSidebar, extra }: SuiteTitleBarProps) => {
  const [hovered, setHovered] = useState(false)

  return (
    <header className="border-border/60 bg-sidebar/55 flex h-14 shrink-0 items-center gap-2.5 border-b px-4 backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle sidebar"
        onClick={onToggleSidebar}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Icon name={toggleIconFor(collapsed, hovered)} className="size-5" />
      </Button>

      {extra ? <div className="ms-auto flex items-center gap-2">{extra}</div> : null}
    </header>
  )
}

export default SuiteTitleBar
