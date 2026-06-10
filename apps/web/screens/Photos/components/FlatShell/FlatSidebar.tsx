"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import logo from "../../../../public/logo.png"
import { fetchApps } from "@lib/apps"
import { authClient } from "@lib/authClient"
import { lockKeys } from "@lib/e2e"
import { formatBytes } from "@lib/format"
import { Icon } from "@lib/icons"
import { fetchAlbums, fetchTags, fetchUsage } from "@lib/photos"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setSearchQuery } from "@store/uiSlice"
import {
  IconChevronDown,
  IconChevronRight,
  IconLogout,
  IconMoon,
  IconSearch,
  IconSelector,
  IconSun,
} from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"
import { useTheme } from "next-themes"
import { motion } from "motion/react"
import Changelog from "@components/Changelog/Changelog"
import DevicesDialog from "@components/DevicesDialog/DevicesDialog"
import { APP_BUILD, APP_VERSION } from "@lib/env"

const NAV_LAYOUT_ID = "photos-nav-active"
const navSpring = { type: "spring" as const, stiffness: 520, damping: 40 }

const ActiveBg = () => (
  <motion.span
    layoutId={NAV_LAYOUT_ID}
    transition={navSpring}
    className="depth-active absolute inset-0 rounded-lg"
  />
)

const NAV = [
  { href: "/photos", label: "All photos", icon: "images-3" },
  { href: "/photos/albums", label: "Albums", icon: "album-3" },
  { href: "/photos/map", label: "Map", icon: "map-pin" },
  { href: "/photos/favourites", label: "Favourites", icon: "favourites" },
  { href: "/photos/trash", label: "Trash", icon: "trash" },
]

const isActive = (pathname: string, href: string): boolean =>
  href === "/photos" ? pathname === href : pathname.startsWith(href)

const SectionLabel = ({ children }: { children: string }) => (
  <p className="text-muted-foreground/70 px-2 pt-2 pb-1 text-[11px] font-medium tracking-wider uppercase">
    {children}
  </p>
)

const NavRow = ({
  href,
  icon,
  label,
  active,
  badge,
}: {
  href: string
  icon: string
  label: string
  active: boolean
  badge?: number
}) => (
  <Link
    href={href}
    className={cn(
      "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
      active
        ? "text-foreground font-medium"
        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40",
    )}
  >
    {active ? <ActiveBg /> : null}
    <Icon name={icon} className="relative size-[18px] shrink-0" />
    <span className="relative min-w-0 flex-1 truncate">{label}</span>
    {badge ? (
      <span className="bg-sidebar-accent text-muted-foreground relative rounded-md px-1.5 text-xs tabular-nums">
        {badge}
      </span>
    ) : null}
  </Link>
)

const FlatSidebar = () => {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const query = useAppSelector((state) => state.ui.searchQuery)
  const { data: session } = authClient.useSession()
  const { resolvedTheme, setTheme } = useTheme()

  const { data: apps } = useQuery({ queryKey: ["apps"], queryFn: fetchApps })
  const { data: albums } = useQuery({ queryKey: ["photos", "albums"], queryFn: fetchAlbums })
  const { data: tags } = useQuery({ queryKey: ["photos", "tags"], queryFn: fetchTags })
  const { data: usage } = useQuery({ queryKey: ["photos", "usage"], queryFn: fetchUsage })
  const [albumsOpen, setAlbumsOpen] = useState(true)
  const [devicesOpen, setDevicesOpen] = useState(false)

  const signOut = async () => {
    lockKeys()
    await authClient.signOut()
    router.replace("/sign-in")
  }

  const usedPct =
    usage?.quotaBytes && usage.quotaBytes > 0
      ? Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100)
      : 0
  const dark = resolvedTheme === "dark"

  return (
    <aside className="bg-sidebar flex h-svh w-[264px] shrink-0 flex-col">
      {/* App switcher — replaces the global app rail + workgroup dropdown */}
      <div className="border-border flex h-14 shrink-0 items-center border-b px-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="hover:bg-sidebar-accent/50 -ml-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1.5 text-left transition"
              >
                <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md">
                  <Image src={logo} alt="PolarHQ" width={28} height={28} className="size-7" />
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">Photos</span>
                    <span className="bg-primary/15 text-primary rounded px-1 py-px text-[9px] font-semibold tracking-wide uppercase">
                      Beta
                    </span>
                  </span>
                  <span className="text-muted-foreground truncate text-[11px]">PolarHQ</span>
                </span>
                <IconSelector className="text-muted-foreground ml-auto size-4 shrink-0" />
              </button>
            }
          />
          <DropdownMenuContent align="start" sideOffset={6} className="w-64 p-2">
            <div className="flex items-center gap-2.5 px-1 pt-0.5 pb-2">
              <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg">
                <Image src={logo} alt="PolarHQ" width={32} height={32} className="size-8" />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-semibold">PolarHQ</span>
                <span className="text-muted-foreground truncate text-[11px]">
                  Personal workspace
                </span>
              </span>
            </div>
            <div className="depth-divider mb-1" />
            <p className="text-muted-foreground/70 px-1.5 pt-1.5 pb-1 text-[11px] font-medium tracking-wider uppercase">
              Apps
            </p>
            {(apps ?? [])
              .filter((app) => app.available && app.route !== "/")
              .map((app) => {
                const current = pathname.startsWith(app.route)
                return (
                  <DropdownMenuItem
                    key={app.id}
                    onClick={() => router.push(app.route)}
                    className="gap-2.5 py-1.5"
                  >
                    <span className="bg-sidebar-accent flex size-7 shrink-0 items-center justify-center rounded-md">
                      <Icon name={app.icon} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">{app.name}</span>
                    {current ? <span className="bg-primary size-2 rounded-full" /> : null}
                  </DropdownMenuItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search — moved into the sidebar */}
      <div className="px-3 pt-3 pb-2">
        <div className="bg-sidebar-accent/40 focus-within:border-ring/40 flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-1.5">
          <IconSearch className="text-muted-foreground size-4 shrink-0" />
          <input
            value={query}
            onChange={(event) => dispatch(setSearchQuery(event.target.value))}
            placeholder="Search photos"
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          <span className="text-muted-foreground/70 hidden items-center gap-0.5 sm:flex">
            <kbd className="bg-sidebar text-muted-foreground/80 rounded px-1 text-[10px]">⌘</kbd>
            <kbd className="bg-sidebar text-muted-foreground/80 rounded px-1 text-[10px]">K</kbd>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        <SectionLabel>Library</SectionLabel>
        {NAV.map((item) => {
          const active = isActive(pathname, item.href)
          if (item.icon === "album-3" && albums && albums.length > 0) {
            return (
              <div key={item.href}>
                <div
                  className={cn(
                    "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    active
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40",
                  )}
                >
                  {active ? <ActiveBg /> : null}
                  <Icon name={item.icon} className="relative size-[18px] shrink-0" />
                  <Link href={item.href} className="relative min-w-0 flex-1 truncate">
                    {item.label}
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={albumsOpen ? "Collapse" : "Expand"}
                    className="relative -mr-1 size-5"
                    onClick={() => setAlbumsOpen((value) => !value)}
                  >
                    <IconChevronRight
                      className={cn("size-3.5 transition-transform", albumsOpen && "rotate-90")}
                    />
                  </Button>
                </div>
                {albumsOpen ? (
                  <ul className="border-border/50 mt-0.5 ml-[18px] flex flex-col gap-0.5 border-l pl-2.5">
                    {albums.slice(0, 8).map((album) => (
                      <li key={album.id}>
                        <Link
                          href={`/photos/albums/${album.id}`}
                          className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40 flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[13px] transition"
                        >
                          <span className="truncate">{album.name}</span>
                          <span className="shrink-0 opacity-60">{album.assetCount}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )
          }
          return (
            <NavRow
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              active={active}
              badge={item.icon === "album-3" ? albums?.length : undefined}
            />
          )
        })}

        {tags && tags.length > 0 ? (
          <>
            <SectionLabel>Tags</SectionLabel>
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/photos/tags/${tag.id}`}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  pathname === `/photos/tags/${tag.id}`
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40",
                )}
              >
                {pathname === `/photos/tags/${tag.id}` ? <ActiveBg /> : null}
                <Icon name="tag" className="relative size-4 shrink-0" />
                <span className="relative min-w-0 flex-1 truncate">{tag.name}</span>
              </Link>
            ))}
          </>
        ) : null}
      </nav>

      {/* Bottom: usage + settings + account */}
      <div className="flex flex-col gap-2 p-3 pt-2">
        <div className="panel rounded-lg p-2.5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Storage</span>
            <span className="text-muted-foreground tabular-nums">
              {usage
                ? `${formatBytes(usage.usedBytes)} / ${usage.quotaBytes ? formatBytes(usage.quotaBytes) : "Unlimited"}`
                : "—"}
            </span>
          </div>
          <div className="bg-sidebar-accent h-1.5 w-full overflow-hidden rounded-full">
            <div className="bg-primary h-full rounded-full" style={{ width: `${usedPct}%` }} />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="panel hover:border-ring/30 flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition"
              >
                <Avatar className="size-8">
                  <AvatarImage
                    src={`https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${encodeURIComponent(
                      session?.user?.email ?? session?.user?.name ?? "user",
                    )}`}
                    alt={session?.user?.name ?? "Account"}
                  />
                  <AvatarFallback className="text-xs">
                    {(session?.user?.name ?? "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{session?.user?.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {session?.user?.email}
                  </span>
                </span>
                <IconChevronDown className="text-muted-foreground ml-auto size-4 shrink-0" />
              </button>
            }
          />
          <DropdownMenuContent align="end" side="top" className="w-[var(--anchor-width)]">
            <DropdownMenuItem onClick={() => setDevicesOpen(true)}>Devices</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <IconLogout className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="px-1 pt-0.5 text-center">
          <Changelog version={APP_VERSION} build={APP_BUILD} />
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            role="switch"
            aria-checked={dark}
            aria-label="Toggle dark mode"
            onClick={() => setTheme(dark ? "light" : "dark")}
            className="bg-sidebar-accent relative h-4 w-7 shrink-0 rounded-full transition-colors"
          >
            <span
              className={cn(
                "bg-background absolute top-0.5 left-0.5 flex size-3 items-center justify-center rounded-full shadow transition-transform",
                dark && "translate-x-3",
              )}
            >
              {dark ? (
                <IconMoon className="size-2" />
              ) : (
                <IconSun className="text-amber-500 size-2" />
              )}
            </span>
          </button>
        </div>
      </div>

      <DevicesDialog open={devicesOpen} onOpenChange={setDevicesOpen} />
    </aside>
  )
}

export default FlatSidebar
