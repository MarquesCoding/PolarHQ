"use client"

import { type ReactElement, Fragment } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { type DocType, editorHref, fetchDocs } from "@lib/docs"
import { createEncryptedDoc } from "@lib/e2e"
import { Icon } from "@lib/icons"
import { useAppSelector } from "@store/hooks"
import { IconPlus } from "@tabler/icons-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { toast } from "sonner"
import StorageMeter from "@components/StorageMeter/StorageMeter"
import WorkspaceSwitcher from "@components/WorkspaceSwitcher/WorkspaceSwitcher"

const withTooltip = (label: string, collapsed: boolean, element: ReactElement): ReactElement => {
  if (!collapsed) return element
  return (
    <Tooltip>
      <TooltipTrigger render={element} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

const NotesSidebar = () => {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const isMobile = useIsMobile()
  const userCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed)
  const collapsed = isMobile || userCollapsed

  const notesQuery = useQuery({
    queryKey: ["docs", "note"],
    queryFn: () => fetchDocs("note"),
    enabled: !collapsed,
  })
  const databasesQuery = useQuery({
    queryKey: ["docs", "database"],
    queryFn: () => fetchDocs("database"),
    enabled: !collapsed,
  })
  const notes = [...(notesQuery.data?.documents ?? []), ...(notesQuery.data?.shared ?? [])]
  const databases = [
    ...(databasesQuery.data?.documents ?? []),
    ...(databasesQuery.data?.shared ?? []),
  ]

  const create = async (type: DocType) => {
    try {
      const doc = await createEncryptedDoc(null, type)
      void queryClient.invalidateQueries({ queryKey: ["docs"] })
      void queryClient.invalidateQueries({ queryKey: ["drive"] })
      router.push(editorHref(type, doc.id))
    } catch {
      toast.error("Could not create")
    }
  }

  const homeLink = (
    <Link
      href="/notes"
      className={cn(
        "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition",
        pathname === "/notes"
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "hover:bg-sidebar-accent/60",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon name="document" className="size-4 shrink-0" />
      {!collapsed ? <span className="truncate">All notes</span> : null}
    </Link>
  )

  const section = (label: string, iconName: string, items: typeof notes, type: DocType) =>
    items.length > 0 ? (
      <div className="flex flex-col gap-0.5">
        <p className="text-muted-foreground px-2.5 pb-1 text-xs font-medium tracking-wide uppercase">
          {label}
        </p>
        {items.map((item) => {
          const active = pathname === `/notes/${item.id}`
          return (
            <Link
              key={item.id}
              href={editorHref(type, item.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition",
                active
                  ? "bg-sidebar-accent/60 font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/40",
              )}
            >
              <Icon name={iconName} className="text-muted-foreground size-3.5 shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          )
        })}
      </div>
    ) : null

  return (
    <aside
      className={cn(
        "panel flex shrink-0 flex-col gap-3 rounded-xl p-2 transition-[width] duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      <WorkspaceSwitcher productName="Notes" icon="document" collapsed={collapsed} />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              size="sm"
              aria-label="Create"
              className={cn("gap-1.5", collapsed ? "w-9 px-0" : "w-full")}
            >
              <IconPlus className="size-4" />
              {!collapsed ? "New" : null}
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => void create("note")}>
            <Icon name="document" className="size-4" />
            New note
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void create("database")}>
            <Icon name="database" className="size-4" />
            New database
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="flex flex-col gap-1">
        <Fragment>{withTooltip("All notes", collapsed, homeLink)}</Fragment>
      </nav>

      {!collapsed && (notes.length > 0 || databases.length > 0) ? (
        <div className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {section("Notes", "document", notes, "note")}
          {section("Databases", "database", databases, "database")}
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <StorageMeter collapsed={collapsed} />
    </aside>
  )
}

export default NotesSidebar
