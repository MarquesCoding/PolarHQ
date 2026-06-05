"use client"

import { type ReactElement, Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { fetchDocs } from "@lib/docs"
import { Icon } from "@lib/icons"
import { useAppSelector } from "@store/hooks"
import { useQuery } from "@tanstack/react-query"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import StorageMeter from "@components/StorageMeter/StorageMeter"
import WorkspaceSwitcher from "@components/WorkspaceSwitcher/WorkspaceSwitcher"
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

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

  const { data } = useQuery({
    queryKey: ["docs", "list"],
    queryFn: () => fetchDocs("doc"),
    enabled: !collapsed,
  })
  const docs = [...(data?.documents ?? []), ...(data?.shared ?? [])]

  const homeLink = (
    <Link
      href="/docs"
      className={cn(
        "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition",
        pathname === "/docs"
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "hover:bg-sidebar-accent/60",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon name="document" className="size-4 shrink-0" />
      {!collapsed ? <span className="truncate">My Documents</span> : null}
    </Link>
  )

  return (
    <aside
      className={cn(
        "panel flex shrink-0 flex-col gap-3 rounded-xl p-2 transition-[width] duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <WorkspaceSwitcher productName="Docs" icon="file-text" collapsed={collapsed} />

      <nav className="flex flex-col gap-1">
        <Fragment>{withTooltip("My Documents", collapsed, homeLink)}</Fragment>
      </nav>

      {!collapsed && docs.length > 0 ? (
        <div className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
          <p className="text-muted-foreground px-2.5 pb-1 text-xs font-medium tracking-wide uppercase">
            Documents
          </p>
          {docs.map((doc) => {
            const active = pathname === `/docs/${doc.id}`
            return (
              <Link
                key={doc.id}
                href={`/docs/${doc.id}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition",
                  active
                    ? "bg-sidebar-accent/60 font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/40",
                )}
              >
                <Icon name="document" className="text-muted-foreground size-3.5 shrink-0" />
                <span className="truncate">{doc.name}</span>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <StorageMeter collapsed={collapsed} />
    </aside>
  )
}

export default DocsSidebar
