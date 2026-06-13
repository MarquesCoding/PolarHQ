"use client"

import { type ReactNode, useState } from "react"
import { Icon } from "@polarhq/ui/components/icon"
import { Button } from "@polarhq/ui/components/button"
import { Input } from "@polarhq/ui/components/input"
import { useIsMobile } from "@polarhq/ui/hooks/use-mobile"

const toggleIconFor = (collapsed: boolean, hovered: boolean): string => {
  if (collapsed) return hovered ? "sidebar-left-2-show" : "layout-left"
  return hovered ? "tile-to-left" : "window-left"
}

interface SuiteTitleBarProps {
  searchPlaceholder: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  collapsed?: boolean
  onToggleSidebar?: () => void
  onBack?: () => void
  onForward?: () => void
  canBack?: boolean
  canForward?: boolean
  extra?: ReactNode
}

/** Shared app title bar: sidebar toggle, history nav, search, and an optional right-side slot. */
const SuiteTitleBar = ({
  searchPlaceholder,
  searchValue = "",
  onSearchChange,
  collapsed = false,
  onToggleSidebar,
  onBack,
  onForward,
  canBack = false,
  canForward = false,
  extra,
}: SuiteTitleBarProps) => {
  const isMobile = useIsMobile()
  const [hovered, setHovered] = useState(false)
  const [searchReadOnly, setSearchReadOnly] = useState(true)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const showSearchField = !isMobile || mobileSearchOpen

  return (
    <header className="panel flex h-12 shrink-0 items-center gap-1 rounded-xl px-2.5">
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

      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Back"
        disabled={!canBack}
        onClick={onBack}
      >
        <Icon name="nav-back" className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Forward"
        disabled={!canForward}
        onClick={onForward}
      >
        <Icon name="nav-forward" className="size-4" />
      </Button>

      {showSearchField ? (
        <div className="relative ml-1 w-full max-w-sm">
          <Icon
            name="search"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            name="vault-search"
            autoComplete="off"
            spellCheck={false}
            autoFocus={isMobile && mobileSearchOpen}
            readOnly={searchReadOnly}
            onFocus={() => setSearchReadOnly(false)}
            onBlur={() => {
              setSearchReadOnly(true)
              if (isMobile) setMobileSearchOpen(false)
            }}
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 pl-7"
          />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Search"
          className="ml-1"
          onClick={() => setMobileSearchOpen(true)}
        >
          <Icon name="search" className="size-5" />
        </Button>
      )}

      {extra ? <div className="ml-auto flex items-center">{extra}</div> : null}
    </header>
  )
}

export default SuiteTitleBar
