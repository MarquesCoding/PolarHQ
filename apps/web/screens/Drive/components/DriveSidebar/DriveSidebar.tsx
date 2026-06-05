"use client"

import { type ReactElement, Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { driveFolderIdFromPath, fetchNodes } from "@lib/drive"
import { Icon } from "@lib/icons"
import { useAppSelector } from "@store/hooks"
import { useQuery } from "@tanstack/react-query"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import StorageMeter from "@components/StorageMeter/StorageMeter"
import WorkspaceSwitcher from "@components/WorkspaceSwitcher/WorkspaceSwitcher"
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

const NAV = [
  { href: "/drive", label: "My Drive", icon: "folder" },
  { href: "/drive/trash", label: "Trash", icon: "trash" },
]

const isActiveHref = (pathname: string, href: string): boolean =>
  href === "/drive"
    ? pathname === "/drive" || (/^\/drive\/[^/]+$/.test(pathname) && pathname !== "/drive/trash")
    : pathname === href

const withTooltip = (label: string, collapsed: boolean, element: ReactElement): ReactElement => {
  if (!collapsed) return element
  return (
    <Tooltip>
      <TooltipTrigger render={element} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

const DriveSidebar = () => {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const userCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed)
  const collapsed = isMobile || userCollapsed

  const folderId = driveFolderIdFromPath(pathname)
  const { data } = useQuery({
    queryKey: ["drive", "nodes", folderId ?? "root"],
    queryFn: () => fetchNodes(folderId ?? undefined),
    enabled: folderId !== null && !collapsed,
  })
  const trail = data?.breadcrumb ?? []
  const showLocation = !collapsed && folderId !== null && trail.length > 1

  return (
    <aside
      className={cn(
        "panel flex shrink-0 flex-col gap-3 rounded-xl p-2 transition-[width] duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <WorkspaceSwitcher productName="Drive" icon="folder" collapsed={collapsed} />

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active = isActiveHref(pathname, item.href)
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

      {showLocation ? (
        <div className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          <p className="text-muted-foreground px-2.5 pb-1 text-xs font-medium tracking-wide uppercase">
            Location
          </p>
          {trail.map((node, index) => (
            <Link
              key={node.id}
              href={index === 0 ? "/drive" : `/drive/${node.id}`}
              style={{ paddingLeft: `${0.625 + index * 0.85}rem` }}
              className={cn(
                "flex items-center gap-1.5 rounded-md py-1 pr-2 text-sm transition",
                index === trail.length - 1
                  ? "bg-sidebar-accent/60 font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/40",
              )}
            >
              <Icon name="folder" className="size-3.5 shrink-0" />
              <span className="truncate">{index === 0 ? "My Drive" : node.name}</span>
            </Link>
          ))}
        </div>
      ) : null}

      <StorageMeter collapsed={collapsed} />
    </aside>
  )
}

export default DriveSidebar
