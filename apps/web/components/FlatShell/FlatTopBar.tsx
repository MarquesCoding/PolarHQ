"use client"

import { type ReactNode } from "react"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"
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
  /** Retained for layout compatibility; the title/app name is no longer shown in the bar. */
  titles?: TopBarTitle[]
  /** Optional right-aligned controls (toolbars, size controls, create buttons…). */
  extra?: ReactNode
}

/** Shared flat top bar: just the sidebar toggle on the left and app controls on the right — the
 *  app/view name lives in the sidebar, so it isn't repeated here. Pages can teleport their own
 *  controls in via <TopBarActions> (the slot div below). */
const FlatTopBar = ({ extra }: FlatTopBarProps) => {
  const { t } = useTranslation("common")

  return (
    <header className="border-border bg-sidebar flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
      <SidebarTrigger className="-ms-1" aria-label={t("flatTopBar.toggleSidebar")} />
      <div className="ms-auto flex items-center gap-2">
        <div id={TOPBAR_SLOT_ID} className="flex items-center gap-2 empty:hidden" />
        {extra}
      </div>
    </header>
  )
}

export default FlatTopBar
