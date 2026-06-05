"use client"

import { type ReactElement, Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon } from "@lib/icons"
import { useAppSelector } from "@store/hooks"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import StorageMeter from "@components/StorageMeter/StorageMeter"
import WorkspaceSwitcher from "@components/WorkspaceSwitcher/WorkspaceSwitcher"
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

const NAV = [{ href: "/docs", label: "My Documents", icon: "file-text" }]

const withTooltip = (label: string, collapsed: boolean, element: ReactElement): ReactElement => {
  if (!collapsed) return element
  return (
    <Tooltip>
      <TooltipTrigger render={element} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

const DocsSidebar = () => {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const userCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed)
  const collapsed = isMobile || userCollapsed

  return (
    <aside
      className={cn(
        "panel flex shrink-0 flex-col gap-3 rounded-xl p-2 transition-[width] duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <WorkspaceSwitcher productName="Docs" icon="file-text" collapsed={collapsed} />

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href
          const link = (
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/60",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon name={item.icon} className="size-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          )
          return <Fragment key={item.href}>{withTooltip(item.label, collapsed, link)}</Fragment>
        })}
      </nav>

      <StorageMeter collapsed={collapsed} />
    </aside>
  )
}

export default DocsSidebar
