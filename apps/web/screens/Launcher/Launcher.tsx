"use client"

import { useNavigation } from "@workspace/screens/platform"
import { fetchApps } from "@workspace/core/apps"
import { authClient } from "@lib/authClient"
import { APP_BUILD, APP_NAME, APP_VERSION } from "@lib/env"
import { formatBytes } from "@lib/format"
import { fetchUsage } from "@workspace/core/photos"
import AppTile from "@pages/Launcher/components/AppTile/AppTile"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"

const Launcher = () => {
  const { t } = useTranslation("common")
  const router = useNavigation()
  const { data: apps, isLoading } = useQuery({ queryKey: ["apps"], queryFn: fetchApps })
  const { data: usage } = useQuery({ queryKey: ["photos", "usage"], queryFn: fetchUsage })
  const { data: session } = authClient.useSession()
  const usedPercent =
    usage?.quotaBytes && usage.quotaBytes > 0
      ? Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100)
      : 0

  const signOut = async () => {
    await authClient.signOut()
    router.replace("/sign-in")
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-8 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{APP_NAME}</h1>
        <div className="flex items-center gap-3">
          {session?.user ? (
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {session.user.email}
            </span>
          ) : null}
          <Button variant="outline" size="sm" onClick={signOut}>
            {t("launcher.signOut")}
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-muted-foreground text-sm font-medium">{t("launcher.yourApps")}</h2>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">{t("launcher.loadingApps")}</p>
        ) : (
          <motion.div
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          >
            {(apps ?? []).map((app) => (
              <AppTile key={app.id} app={app} />
            ))}
          </motion.div>
        )}
      </section>

      <footer className="border-border/60 mt-auto flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-end sm:justify-between">
        {usage ? (
          <div className="flex w-full max-w-xs flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">{t("launcher.storage")}</span>
              <span className="text-muted-foreground">
                {formatBytes(usage.usedBytes)}
                {usage.quotaBytes
                  ? ` ${t("launcher.ofQuota", { quota: formatBytes(usage.quotaBytes) })}`
                  : ""}
              </span>
            </div>
            <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
          </div>
        ) : (
          <span />
        )}
        <p className="text-muted-foreground/60 font-mono text-[10px] tracking-tight">
          {t("launcher.versionBuild", { version: APP_VERSION, build: APP_BUILD })}
        </p>
      </footer>
    </main>
  )
}

export default Launcher
