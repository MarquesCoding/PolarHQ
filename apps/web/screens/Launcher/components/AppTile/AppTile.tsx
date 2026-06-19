"use client"

import { useNavigation } from "@workspace/screens/platform"
import type { SuiteApp } from "@workspace/core/apps"
import { Icon } from "@lib/icons"
import { useAppDispatch } from "@store/hooks"
import { setActiveApp } from "@store/uiSlice"
import { Card } from "@workspace/ui/components/card"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"

export const tileVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

interface AppTileProps {
  app: SuiteApp
}

const AppTile = ({ app }: AppTileProps) => {
  const { t } = useTranslation("common")
  const router = useNavigation()
  const dispatch = useAppDispatch()

  const open = () => {
    if (!app.available) return
    dispatch(setActiveApp(app.id))
    router.push(app.route)
  }

  return (
    <motion.div
      variants={tileVariants}
      whileHover={app.available ? { scale: 1.03 } : undefined}
      whileTap={app.available ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      <Card
        role="button"
        tabIndex={app.available ? 0 : -1}
        aria-disabled={!app.available}
        aria-label={app.name}
        onClick={open}
        onKeyDown={(event) => {
          if (app.available && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault()
            open()
          }
        }}
        className={cn(
          "relative flex h-full flex-col items-center gap-3 p-6 text-center transition",
          app.available
            ? "hover:border-primary/40 hover:bg-accent/40 cursor-pointer"
            : "opacity-60",
        )}
      >
        {app.status === "coming_soon" ? (
          <span className="bg-muted text-muted-foreground absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-medium">
            {t("appTile.soon")}
          </span>
        ) : app.beta ? (
          <span className="bg-primary/15 text-primary absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-medium">
            {t("appTile.beta")}
          </span>
        ) : null}
        <Icon name={app.icon} className="size-8" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{app.name}</p>
          <p className="text-muted-foreground text-xs leading-snug">{app.description}</p>
        </div>
      </Card>
    </motion.div>
  )
}

export default AppTile
