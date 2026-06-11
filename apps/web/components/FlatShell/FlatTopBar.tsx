"use client"

import { type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Icon } from "@lib/icons"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setSidebarMobileOpen, toggleSidebar } from "@store/uiSlice"
import { Button } from "@workspace/ui/components/button"
import { useTranslation } from "react-i18next"

export interface TopBarTitle {
  /** Returns true when this entry should be shown for the given pathname. */
  match: (pathname: string) => boolean
  label: string
  icon: string
}

/** Portal target id for page-injected top-bar controls (see TopBarActions). */
export const TOPBAR_SLOT_ID = "flat-topbar-slot"

interface FlatTopBarProps {
  /** Ordered title entries; the first match (falling back to the first entry) is shown. */
  titles: TopBarTitle[]
  /** Optional right-aligned controls (toolbars, size controls, create buttons…). */
  extra?: ReactNode
}

/** Shared flat top bar: a route-aware icon + title on the left, app controls on the right.
 *  Pages can also teleport their own controls in via <TopBarActions> (the slot div below). */
const FlatTopBar = ({ titles, extra }: FlatTopBarProps) => {
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed)
  const { t } = useTranslation("common")
  const current = titles.find((entry) => entry.match(pathname)) ?? titles[0]

  return (
    <header className="border-border bg-sidebar flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("flatTopBar.openSidebar")}
        className="-ms-1 md:hidden"
        onClick={() => dispatch(setSidebarMobileOpen(true))}
      >
        <Icon name="sidebar-left-2-show" className="size-[18px]" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("flatTopBar.toggleSidebar")}
        className="-ms-1 hidden md:inline-flex"
        onClick={() => dispatch(toggleSidebar())}
      >
        <Icon
          name={collapsed ? "sidebar-left-2-show" : "sidebar-left-2-hide"}
          className="size-[18px]"
        />
      </Button>
      {current ? (
        <>
          <Icon name={current.icon} className="text-muted-foreground size-[18px]" />
          <span className="text-sm font-medium">{current.label}</span>
        </>
      ) : null}
      <div className="ms-auto flex items-center gap-2">
        <div id={TOPBAR_SLOT_ID} className="flex items-center gap-2 empty:hidden" />
        {extra}
      </div>
    </header>
  )
}

export default FlatTopBar
