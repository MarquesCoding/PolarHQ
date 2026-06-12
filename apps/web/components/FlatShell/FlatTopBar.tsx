"use client"

import { type ReactNode } from "react"
import { IconSearch } from "@tabler/icons-react"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setSearchQuery } from "@store/uiSlice"
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
  /** Show the centred search field (defaults to true; admin opts out). */
  searchable?: boolean
}

/** Shared flat top bar: sidebar toggle (left), a centred search field, and app controls (right).
 *  Pages can teleport their own controls in via <TopBarActions> (the slot div below). */
const FlatTopBar = ({ extra, searchable = true }: FlatTopBarProps) => {
  const { t } = useTranslation("common")
  const dispatch = useAppDispatch()
  const query = useAppSelector((state) => state.ui.searchQuery)

  return (
    <header className="border-border bg-sidebar grid h-11 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2.5 border-b px-4">
      <div className="flex items-center">
        <SidebarTrigger className="-ms-1" aria-label={t("flatTopBar.toggleSidebar")} />
      </div>

      {searchable ? (
        <div className="bg-sidebar-accent/40 focus-within:border-ring/40 flex w-[min(28rem,55vw)] items-center gap-2 justify-self-center rounded-lg border border-transparent px-2.5 py-1">
          <IconSearch className="text-muted-foreground size-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => dispatch(setSearchQuery(event.target.value))}
            placeholder={t("flatTopBar.search")}
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <span className="text-muted-foreground/70 hidden items-center gap-0.5 sm:flex">
            <kbd className="bg-sidebar text-muted-foreground/80 rounded px-1 text-[10px]">⌘</kbd>
            <kbd className="bg-sidebar text-muted-foreground/80 rounded px-1 text-[10px]">K</kbd>
          </span>
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center justify-end gap-2">
        <div id={TOPBAR_SLOT_ID} className="flex items-center gap-2 empty:hidden" />
        {extra}
      </div>
    </header>
  )
}

export default FlatTopBar
