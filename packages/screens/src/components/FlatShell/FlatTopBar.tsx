import { type ReactNode } from "react"
import { usePathname } from "@workspace/screens/platform"
import { Icon } from "@workspace/screens/icons"
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
  /** Ordered title entries; the first match (falling back to the first entry) is shown. */
  titles: TopBarTitle[]
  /** Optional right-aligned controls (toolbars, size controls, create buttons…). */
  extra?: ReactNode
}

/** Shared flat top bar: a route-aware icon + title on the left, app controls on the right.
 *  Pages can also teleport their own controls in via <TopBarActions> (the slot div below). */
const FlatTopBar = ({ titles, extra }: FlatTopBarProps) => {
  const pathname = usePathname()
  const { t } = useTranslation("common")
  const current = titles.find((entry) => entry.match(pathname)) ?? titles[0]

  return (
    <header
      data-slot="flat-topbar"
      className="border-border/60 bg-sidebar/55 flex h-14 shrink-0 items-center gap-2.5 border-b px-4 backdrop-blur-xl"
    >
      <SidebarTrigger className="-ms-1" aria-label={t("flatTopBar.toggleSidebar")} />
      {current ? (
        <span data-slot="topbar-title" className="flex items-center gap-2.5">
          <Icon name={current.icon} className="text-muted-foreground size-[18px]" />
          <span className="text-sm font-medium">{current.label}</span>
        </span>
      ) : null}
      <div data-slot="topbar-actions" className="ms-auto flex items-center gap-2 empty:hidden">
        <div id={TOPBAR_SLOT_ID} className="flex items-center gap-2 empty:hidden" />
        {extra}
      </div>
    </header>
  )
}

export default FlatTopBar
