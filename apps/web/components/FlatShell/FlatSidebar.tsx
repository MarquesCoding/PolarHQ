"use client"

import { type ReactNode, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { fetchApps } from "@lib/apps"
import { authClient } from "@lib/authClient"
import { lockKeys } from "@lib/e2e"
import { fetchStorageStats } from "@lib/drive"
import { bytesParts, formatBytes } from "@lib/format"
import { Icon } from "@lib/icons"
import { applyThemeWithReveal } from "@lib/themeTransition"
import { IconChevronDown, IconLogout, IconMoon, IconSun } from "@tabler/icons-react"
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
import { cn } from "@workspace/ui/lib/utils"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import Changelog from "@components/Changelog/Changelog"
import DevicesDialog from "@components/DevicesDialog/DevicesDialog"
import StorageDialog from "@components/StorageDialog/StorageDialog"
import { replayOnboarding } from "@components/OnboardingCard/OnboardingCard"
import { APP_BUILD, APP_NAME, APP_VERSION } from "@lib/env"

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
  /** The nav content — built with the shared `NavRow`/`SectionLabel` primitives. */
  children: ReactNode
}

/**
 * Shared "flat" sidebar chrome used by every app: a single full-height column with the
 * app switcher, a nav slot, and the usage / account / version / theme footer. Apps supply only
 * their own nav rows as `children`; everything else is identical across apps. (Search lives in the
 * top bar.)
 */
const FlatSidebar = ({ productName, beta, children }: FlatSidebarProps) => {
  const { t } = useTranslation("common")
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const { resolvedTheme, setTheme } = useTheme()

  const { data: apps } = useQuery({ queryKey: ["apps"], queryFn: fetchApps })
  const { data: usage } = useQuery({ queryKey: ["drive", "storage"], queryFn: fetchStorageStats })
  const [devicesOpen, setDevicesOpen] = useState(false)
  const [storageOpen, setStorageOpen] = useState(false)

  const signOut = async () => {
    lockKeys()
    await authClient.signOut()
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

  const dark = resolvedTheme === "dark"

  return (
    <Sidebar collapsible="offcanvas">
      <div className="flex shrink-0 items-center gap-2 px-4 pt-4 pb-1">
        <img src="/logo.png" alt={APP_NAME} className="size-[22px] shrink-0 rounded-md" />
        <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
      </div>
      <div className="flex h-11 shrink-0 items-center px-3 pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="border-border/60 bg-background hover:bg-sidebar-accent/50 flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border px-2.5 py-2 text-start transition"
              >
                <span className="truncate text-sm font-medium">{productName}</span>
                {beta ? (
                  <span className="bg-primary/15 text-primary rounded px-1 py-px text-[9px] font-semibold tracking-wide uppercase">
                    {t("flatSidebar.beta")}
                  </span>
                ) : null}
                <IconChevronDown className="text-muted-foreground ms-auto size-4 shrink-0" />
              </button>
            }
          />
          <DropdownMenuContent align="start" sideOffset={6} className="w-52 p-1.5">
            {(apps ?? [])
              .filter((app) => app.available && app.route !== "/" && app.id !== "admin")
              .map((app) => {
                const current = pathname.startsWith(app.route)
                return (
                  <DropdownMenuItem
                    key={app.id}
                    onClick={() => router.push(app.route)}
                    className={cn("gap-2.5 py-1.5", current && "bg-sidebar-accent")}
                  >
                    <span className="bg-sidebar-accent flex size-6 shrink-0 items-center justify-center rounded-md">
                      <Icon name={app.icon} className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {t(`apps.${app.id}`, { defaultValue: app.name })}
                    </span>
                  </DropdownMenuItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <motion.nav
        variants={navContainerVariants}
        initial="hidden"
        animate="visible"
        className="scrollbar-slim flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3 pt-2"
      >
        {children}
      </motion.nav>

      <div className="flex flex-col gap-2 p-3 pt-2">
        <Button
          variant="ghost"
          onClick={() => setStorageOpen(true)}
          aria-label={t("storageDialog.open")}
          className="panel hover:border-ring/30 flex h-auto w-full flex-col items-stretch gap-0 rounded-lg p-2.5 text-start transition [background-clip:padding-box,border-box]!"
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

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="panel hover:border-ring/30 flex w-full items-center gap-2.5 rounded-lg p-2 text-start transition"
              >
                <Avatar className="size-8">
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
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{session?.user?.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {session?.user?.email}
                  </span>
                </span>
                <IconChevronDown className="text-muted-foreground ms-auto size-4 shrink-0" />
              </button>
            }
          />
          <DropdownMenuContent align="end" side="top" className="w-[var(--anchor-width)]">
            <DropdownMenuItem onClick={() => router.push("/account")}>{t("flatSidebar.account")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDevicesOpen(true)}>{t("flatSidebar.devices")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin")}>{t("flatSidebar.settings")}</DropdownMenuItem>
            <DropdownMenuItem onClick={replayOnboarding}>{t("flatSidebar.replayIntro")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <IconLogout className="size-4" />
              {t("flatSidebar.signOut")}
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
            aria-label={t("flatSidebar.toggleDarkMode")}
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
                "bg-background absolute top-0.5 start-0.5 flex size-3 items-center justify-center rounded-full shadow transition-transform",
                dark && "translate-x-3 rtl:-translate-x-3",
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
      <StorageDialog open={storageOpen} onOpenChange={setStorageOpen} />
    </Sidebar>
  )
}

export default FlatSidebar
