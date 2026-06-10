"use client"

import { type ReactNode, useState } from "react"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import logo from "../../public/logo.png"
import { fetchApps } from "@lib/apps"
import { authClient } from "@lib/authClient"
import { lockKeys } from "@lib/e2e"
import { formatBytes } from "@lib/format"
import { Icon } from "@lib/icons"
import { fetchUsage } from "@lib/photos"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setSearchQuery } from "@store/uiSlice"
import { applyThemeWithReveal } from "@lib/themeTransition"
import {
  IconChevronDown,
  IconLogout,
  IconMoon,
  IconSearch,
  IconSelector,
  IconSun,
} from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"
import { useTheme } from "next-themes"
import Changelog from "@components/Changelog/Changelog"
import DevicesDialog from "@components/DevicesDialog/DevicesDialog"
import { replayOnboarding } from "@components/OnboardingCard/OnboardingCard"
import { APP_BUILD, APP_VERSION } from "@lib/env"

interface FlatSidebarProps {
  /** Product name shown in the app-switcher header, e.g. "Photos". */
  productName: string
  /** Whether to show a Beta chip beside the product name. */
  beta?: boolean
  /** Placeholder for the sidebar search field. */
  searchPlaceholder: string
  /** Whether the search field dispatches into the shared `ui.searchQuery` (default true). */
  searchable?: boolean
  /** The nav content — built with the shared `NavRow`/`SectionLabel` primitives. */
  children: ReactNode
}

/**
 * Shared "flat" sidebar chrome used by every app: a single full-height column with the
 * app switcher, sidebar search, a nav slot, and the usage / account / version / theme footer.
 * Apps supply only their own nav rows as `children`; everything else is identical across apps.
 */
const FlatSidebar = ({
  productName,
  beta,
  searchPlaceholder,
  searchable = true,
  children,
}: FlatSidebarProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const query = useAppSelector((state) => state.ui.searchQuery)
  const { data: session } = authClient.useSession()
  const { resolvedTheme, setTheme } = useTheme()

  const { data: apps } = useQuery({ queryKey: ["apps"], queryFn: fetchApps })
  const { data: usage } = useQuery({ queryKey: ["photos", "usage"], queryFn: fetchUsage })
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
                    <span className="truncate text-sm font-semibold">{productName}</span>
                    {beta ? (
                      <span className="bg-primary/15 text-primary rounded px-1 py-px text-[9px] font-semibold tracking-wide uppercase">
                        Beta
                      </span>
                    ) : null}
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
              .filter((app) => app.available && app.route !== "/" && app.id !== "admin")
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
      {searchable ? (
        <div className="px-3 pt-3 pb-2">
          <div className="bg-sidebar-accent/40 focus-within:border-ring/40 flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-1.5">
            <IconSearch className="text-muted-foreground size-4 shrink-0" />
            <input
              value={query}
              onChange={(event) => dispatch(setSearchQuery(event.target.value))}
              placeholder={searchPlaceholder}
              className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <span className="text-muted-foreground/70 hidden items-center gap-0.5 sm:flex">
              <kbd className="bg-sidebar text-muted-foreground/80 rounded px-1 text-[10px]">⌘</kbd>
              <kbd className="bg-sidebar text-muted-foreground/80 rounded px-1 text-[10px]">K</kbd>
            </span>
          </div>
        </div>
      ) : (
        <div className="pt-1" />
      )}

      {/* Nav */}
      <nav className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {children}
      </nav>

      {/* Bottom: usage + account + version + theme */}
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
            <DropdownMenuItem onClick={replayOnboarding}>Replay intro</DropdownMenuItem>
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
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              applyThemeWithReveal(
                () => setTheme(dark ? "light" : "dark"),
                { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
                dark,
              )
            }}
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
                <IconSun className="size-2 text-amber-500" />
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
