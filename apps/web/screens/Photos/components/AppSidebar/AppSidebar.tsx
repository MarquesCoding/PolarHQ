"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Icon } from "@lib/icons"
import { fetchAlbums, fetchTags } from "@lib/photos"
import { useAppSelector } from "@store/hooks"
import { IconChevronRight } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import SuiteSidebar, { type SuiteNavItem } from "@workspace/ui/components/suite-sidebar"
import { cn } from "@workspace/ui/lib/utils"
import { AnimatePresence, motion } from "motion/react"
import StorageMeter from "@components/StorageMeter/StorageMeter"
import WorkspaceSwitcher from "@components/WorkspaceSwitcher/WorkspaceSwitcher"

const NAV = [
  { href: "/photos", label: "Photos", icon: "images-3" },
  { href: "/photos/albums", label: "Albums", icon: "album-3" },
  { href: "/photos/map", label: "Map", icon: "map-pin" },
  { href: "/photos/favourites", label: "Favourites", icon: "favourites" },
  { href: "/photos/trash", label: "Trash", icon: "trash" },
]

const isActiveHref = (pathname: string, href: string): boolean =>
  href === "/photos" ? pathname === href : pathname.startsWith(href)

const AppSidebar = () => {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const userCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed)
  const collapsed = isMobile || userCollapsed

  const { data: tags } = useQuery({ queryKey: ["photos", "tags"], queryFn: fetchTags })
  const { data: albums } = useQuery({ queryKey: ["photos", "albums"], queryFn: fetchAlbums })
  const [albumsOpen, setAlbumsOpen] = useState(true)

  const items: SuiteNavItem[] = NAV.map((item) => ({
    key: item.href,
    label: item.label,
    icon: item.icon,
    href: item.href,
    active: isActiveHref(pathname, item.href),
  }))

  return (
    <SuiteSidebar
      collapsed={collapsed}
      linkAs={Link}
      header={<WorkspaceSwitcher productName="Photos" icon="images-3" collapsed={collapsed} />}
      footer={<StorageMeter collapsed={collapsed} />}
      items={items}
      renderItem={(item) => {
        if (item.icon !== "album-3" || collapsed || !albums || albums.length === 0) return undefined
        return (
          <div>
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition",
                item.active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <Icon name={item.icon} className="size-4 shrink-0" />
              <Link href={item.href} className="min-w-0 flex-1 truncate">
                {item.label}
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={albumsOpen ? "Collapse albums" : "Expand albums"}
                className="-mr-1 size-6 shrink-0"
                onClick={() => setAlbumsOpen((value) => !value)}
              >
                <IconChevronRight
                  className={cn("size-4 transition-transform", albumsOpen && "rotate-90")}
                />
              </Button>
            </div>
            <AnimatePresence initial={false}>
              {albumsOpen ? (
                <motion.ul
                  className="border-border/60 mt-0.5 ml-4 flex flex-col gap-0.5 overflow-hidden border-l pl-2"
                  initial="hidden"
                  animate="show"
                  exit="hidden"
                  variants={{ show: { transition: { staggerChildren: 0.025 } }, hidden: {} }}
                >
                  {albums.slice(0, 10).map((album) => (
                    <motion.li
                      key={album.id}
                      variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                    >
                      <Link
                        href={`/photos/albums/${album.id}`}
                        className="text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs transition"
                      >
                        <span className="truncate">{album.name}</span>
                        <span className="shrink-0 opacity-60">{album.assetCount}</span>
                      </Link>
                    </motion.li>
                  ))}
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </div>
        )
      }}
    >
      {!collapsed && tags && tags.length > 0 ? (
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground px-2.5 text-xs font-medium tracking-wide uppercase">
            Tags
          </p>
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/photos/tags/${tag.id}`}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-sm",
                pathname === `/photos/tags/${tag.id}`
                  ? "bg-sidebar-accent font-medium"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Icon name="tag" className="size-3.5 shrink-0" />
                <span className="truncate">{tag.name}</span>
              </span>
              <span className="text-muted-foreground text-xs">{tag.count}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </SuiteSidebar>
  )
}

export default AppSidebar
