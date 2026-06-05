"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Icon } from "@lib/icons"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setSearchQuery, toggleSidebar } from "@store/uiSlice"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

const toggleIconFor = (collapsed: boolean, hovered: boolean): string => {
  if (collapsed) return hovered ? "sidebar-left-2-show" : "layout-left"
  return hovered ? "tile-to-left" : "window-left"
}

interface SuiteTitleBarProps {
  searchPlaceholder: string
  extra?: ReactNode
}

/** Shared app title bar: sidebar toggle, history nav, search, and an optional right-side slot. */
const SuiteTitleBar = ({ searchPlaceholder, extra }: SuiteTitleBarProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const query = useAppSelector((state) => state.ui.searchQuery)
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed)
  const [hovered, setHovered] = useState(false)
  const [canBack, setCanBack] = useState(false)
  const [canForward, setCanForward] = useState(false)
  const lastAction = useRef<"back" | "forward" | null>(null)

  useEffect(() => {
    setCanBack(window.history.length > 1)
    if (lastAction.current === "back") setCanForward(true)
    else if (lastAction.current === null) setCanForward(false)
    lastAction.current = null
  }, [pathname])

  const goBack = () => {
    lastAction.current = "back"
    router.back()
  }
  const goForward = () => {
    lastAction.current = "forward"
    router.forward()
  }

  return (
    <header className="panel flex h-12 shrink-0 items-center gap-1 rounded-xl px-2.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Toggle sidebar"
        onClick={() => dispatch(toggleSidebar())}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Icon name={toggleIconFor(collapsed, hovered)} className="size-5" />
      </Button>

      <Button variant="ghost" size="icon-xs" aria-label="Back" disabled={!canBack} onClick={goBack}>
        <Icon name="nav-back" className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Forward"
        disabled={!canForward}
        onClick={goForward}
      >
        <Icon name="nav-forward" className="size-4" />
      </Button>

      <div className="relative ml-1 w-full max-w-sm">
        <Icon name="search" className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => dispatch(setSearchQuery(event.target.value))}
          placeholder={searchPlaceholder}
          className="h-9 pl-7"
        />
      </div>

      {extra ? <div className="ml-auto hidden items-center sm:flex">{extra}</div> : null}
    </header>
  )
}

export default SuiteTitleBar
