"use client"

import { type ReactElement } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon } from "@lib/icons"
import { useAppSelector } from "@store/hooks"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import WorkspaceSwitcher from "@components/WorkspaceSwitcher/WorkspaceSwitcher"
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

const NAV = [
  { href: "/admin", label: "Overview", icon: "gauge" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/groups", label: "Groups", icon: "users-group" },
  { href: "/admin/workgroups", label: "Workgroups", icon: "buildings" },
  { href: "/admin/roles", label: "Roles", icon: "user-shield" },
  { href: "/admin/apps", label: "Apps", icon: "apps" },
  { href: "/admin/limits", label: "Limits", icon: "sliders" },
  { href: "/admin/branding", label: "Branding", icon: "palette" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
  { href: "/admin/audit", label: "Audit log", icon: "list" },
]

const isActiveHref = (pathname: string, href: string): boolean =>
  href === "/admin" ? pathname === href : pathname.startsWith(href)

const withTooltip = (label: string, collapsed: boolean, element: ReactElement): ReactElement => {
  if (!collapsed) return element
  return (
    <Tooltip>
      <TooltipTrigger render={element} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

const AdminSidebar = () => {
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
      <WorkspaceSwitcher productName="Admin" icon="shield-lock" collapsed={collapsed} />

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = isActiveHref(pathname, item.href)
          const link = (
            <Link
              key={item.href}
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
          return withTooltip(item.label, collapsed, link)
        })}
      </nav>
    </aside>
  )
}

export default AdminSidebar
