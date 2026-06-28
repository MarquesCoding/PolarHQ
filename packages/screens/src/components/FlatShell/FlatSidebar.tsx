import { type ReactNode, useEffect, useState } from "react"
import { usePathname, useNavigation } from "@workspace/screens/platform"
import logo from "./logo.png"
import { fetchApps } from "@workspace/core/apps"
import { fetchSetupStatus } from "@workspace/core/setup"
import { authClient } from "@workspace/core/authClient"
import { setAuthToken } from "@workspace/core/authToken"
import { lockKeys } from "@workspace/core/e2e"
import { fetchStorageStats } from "@workspace/core/drive"
import { bytesParts, formatBytes } from "@workspace/core/format"
import { Icon } from "@workspace/screens/icons"
import { useAppDispatch, useAppSelector } from "@workspace/screens/store/hooks"
import { setSearchQuery } from "@workspace/screens/store/uiSlice"
import { CaretUpDown, MagnifyingGlass, ShieldCheck, SignOut } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import NumberFlow from "@number-flow/react"
import { motion } from "motion/react"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { Sidebar } from "@workspace/ui/components/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { useTranslation } from "react-i18next"
import Changelog from "@components/Changelog/Changelog"
import DevicesDialog from "@components/DevicesDialog/DevicesDialog"
import StorageDialog from "@components/StorageDialog/StorageDialog"
import { replayOnboarding } from "@components/OnboardingCard/OnboardingCard"
import { coreConfig } from "@workspace/core/config"

/** Stagger the nav rows in on mount. Each app has its own layout/sidebar, so this replays exactly
 *  when switching apps (not on within-app navigation, where the sidebar persists). */
const navContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
}

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
  const { t } = useTranslation("common")
  const pathname = usePathname()
  const router = useNavigation()
  const dispatch = useAppDispatch()
  const query = useAppSelector((state) => state.ui.searchQuery)
  const { data: session } = authClient.useSession()

  const { data: apps } = useQuery({ queryKey: ["apps"], queryFn: fetchApps })
  const isAdmin = (apps ?? []).some((app) => app.id === "admin" && app.available)
  const { data: setupStatus } = useQuery({ queryKey: ["setup-status"], queryFn: fetchSetupStatus })
  const readOnly = (setupStatus?.demoMode ?? false) && !isAdmin
  const { data: usage } = useQuery({ queryKey: ["drive", "storage"], queryFn: fetchStorageStats })
  const [devicesOpen, setDevicesOpen] = useState(false)
  const [storageOpen, setStorageOpen] = useState(false)

  const signOut = async () => {
    lockKeys()
    await authClient.signOut()
    setAuthToken(null)
    router.replace("/sign-in")
  }

  const usedPct =
    usage?.quotaBytes && usage.quotaBytes > 0
      ? Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100)
      : 0
  const usedParts = bytesParts(usage?.usedBytes ?? 0)
  const totalLabel = usage?.quotaBytes
    ? formatBytes(usage.quotaBytes)
    : t("flatSidebar.unlimited")

  const [shownUsed, setShownUsed] = useState(0)
  useEffect(() => {
    if (!usage) return
    const frame = requestAnimationFrame(() => setShownUsed(bytesParts(usage.usedBytes).value))
    return () => cancelAnimationFrame(frame)
  }, [usage])

  return (
    <Sidebar collapsible="offcanvas">
      <div className="flex h-14 shrink-0 items-center gap-2 px-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="hover:bg-sidebar-accent/50 -ms-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1.5 text-start transition"
              >
                <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md">
                  <img src={logo} alt="PolarHQ" width={28} height={28} className="size-7" />
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{productName}</span>
                    {beta ? (
                      <span className="bg-primary/15 text-primary rounded px-1 py-px text-[9px] font-semibold tracking-wide uppercase">
                        {t("flatSidebar.beta")}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-muted-foreground truncate text-[11px]">PolarHQ</span>
                </span>
                <CaretUpDown className="text-muted-foreground ms-auto size-4 shrink-0" />
              </button>
            }
          />
          <DropdownMenuContent align="start" sideOffset={6} className="w-64 p-2">
            <p className="text-muted-foreground/70 px-1.5 pt-0.5 pb-1 text-[11px] font-medium tracking-wider uppercase">
              {t("flatSidebar.apps")}
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
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {t(`apps.${app.id}`, { defaultValue: app.name })}
                    </span>
                    {current ? <span className="bg-primary size-2 rounded-full" /> : null}
                  </DropdownMenuItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label={t("flatSidebar.account")}
                className="hover:ring-ring/30 focus-visible:ring-ring/50 ms-auto shrink-0 rounded-full ring-2 ring-transparent outline-none transition"
              >
                <Avatar className="size-7">
                  <AvatarImage
                    src={`https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${encodeURIComponent(
                      session?.user?.email ?? session?.user?.name ?? "user",
                    )}`}
                    alt={session?.user?.name ?? t("flatSidebar.account")}
                  />
                  <AvatarFallback className="text-xs">
                    {(session?.user?.name ?? "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={8} className="w-56">
            <div className="flex flex-col px-2 py-1.5 leading-tight">
              <span className="truncate text-sm font-medium">{session?.user?.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {session?.user?.email}
              </span>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/account")}>
              {t("flatSidebar.account")}
            </DropdownMenuItem>
            {!readOnly ? (
              <DropdownMenuItem onClick={() => setDevicesOpen(true)}>
                {t("flatSidebar.devices")}
              </DropdownMenuItem>
            ) : null}
            {isAdmin ? (
              <DropdownMenuItem onClick={() => router.push("/admin")}>
                <ShieldCheck className="size-4" />
                {t("apps.admin")}
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={replayOnboarding}>
              {t("flatSidebar.replayIntro")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <SignOut className="size-4" />
              {t("flatSidebar.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {searchable ? (
        <div className="px-3 pt-3 pb-2">
          <div className="bg-sidebar-accent/40 focus-within:border-ring/40 flex items-center gap-2 rounded-lg border border-transparent px-2.5 py-1.5">
            <MagnifyingGlass className="text-muted-foreground size-4 shrink-0" />
            <input
              type="search"
              name="sidebar-search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore
              data-lpignore="true"
              value={query}
              onChange={(event) => dispatch(setSearchQuery(event.target.value))}
              placeholder={searchPlaceholder}
              className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-sm outline-none [&::-webkit-search-cancel-button]:appearance-none"
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

      <motion.nav
        variants={navContainerVariants}
        initial="hidden"
        animate="visible"
        className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3"
      >
        {children}
      </motion.nav>

      <div className="flex flex-col gap-2 p-3 pt-2">
        <Button
          variant="ghost"
          onClick={() => setStorageOpen(true)}
          aria-label={t("storageDialog.open")}
          className="flex h-auto w-full flex-col items-stretch gap-0 rounded-lg bg-transparent px-1 py-1.5 text-start transition hover:bg-transparent hover:opacity-80"
        >
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">{t("flatSidebar.storage")}</span>
            <span dir="ltr" className="text-muted-foreground tabular-nums">
              {usage ? (
                <NumberFlow
                  value={shownUsed}
                  suffix={` ${usedParts.unit} / ${totalLabel}`}
                  format={{
                    minimumFractionDigits: usedParts.decimals,
                    maximumFractionDigits: usedParts.decimals,
                  }}
                  respectMotionPreference={false}
                />
              ) : (
                "—"
              )}
            </span>
          </div>
          <div className="bg-sidebar-accent h-1.5 w-full overflow-hidden rounded-full">
            <motion.div
              className="bg-primary h-full rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${usedPct}%` }}
              transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
            />
          </div>
        </Button>

        <div className="px-1 pt-0.5 text-center">
          <Changelog version={coreConfig().appVersion} build={coreConfig().appBuild} />
        </div>
      </div>

      <DevicesDialog open={devicesOpen} onOpenChange={setDevicesOpen} />
      <StorageDialog open={storageOpen} onOpenChange={setStorageOpen} />
    </Sidebar>
  )
}

export default FlatSidebar
