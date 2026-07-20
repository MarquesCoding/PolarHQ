import { AppLink as Link, usePathname } from "@workspace/screens/platform"
import {
  deleteSavedSearch,
  driveFolderIdFromPath,
  fetchNodes,
  fetchSavedSearches,
} from "@workspace/core/drive"
import { Icon } from "@workspace/screens/icons"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { motion } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"
import { NavRow, SectionLabel, navItemVariants, navRowClass } from "@components/FlatShell"
import DevicesNav from "@pages/Drive/components/DevicesNav/DevicesNav"

/** Device-first Drive nav: Overview on top, then the Devices section (cloud views + this computer's
 *  synced folders + P2P) and saved searches. The current-folder trail lives in the top toolbar. */
const DriveNav = () => {
  const { t } = useTranslation("drive")
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const folderId = driveFolderIdFromPath(pathname)
  useQuery({
    queryKey: ["drive", "nodes", folderId ?? "root"],
    queryFn: () => fetchNodes(folderId ?? undefined),
    enabled: folderId !== null,
  })
  const { data: searches = [] } = useQuery({
    queryKey: ["drive", "searches"],
    queryFn: fetchSavedSearches,
  })

  const removeSearch = async (id: string) => {
    await deleteSavedSearch(id)
    void queryClient.invalidateQueries({ queryKey: ["drive", "searches"] })
  }

  return (
    <>
      <NavRow href="/drive" icon="gauge" label={t("driveNav.overview")} active={pathname === "/drive"} />

      <DevicesNav />

      {searches.length > 0 ? (
        <>
          <SectionLabel>{t("driveNav.savedSearches")}</SectionLabel>
          {searches.map((search) => {
            const active = pathname === `/drive/search/${search.id}`
            return (
              <motion.div
                key={search.id}
                variants={navItemVariants}
                className="group/sr relative flex items-center"
              >
                <Link
                  href={`/drive/search/${search.id}`}
                  className={cn(navRowClass(active, true), "min-w-0 flex-1 pr-7", active && "bg-sidebar-accent/60")}
                >
                  <Icon name="search" className="relative size-4 shrink-0" />
                  <span className="relative truncate">{search.name}</span>
                </Link>
                <button
                  type="button"
                  aria-label={t("driveNav.removeSearch")}
                  onClick={() => void removeSearch(search.id)}
                  className="text-muted-foreground hover:text-foreground absolute right-1.5 flex size-5 items-center justify-center rounded opacity-0 transition group-hover/sr:opacity-100"
                >
                  <Icon name="xmark" className="size-3.5" />
                </button>
              </motion.div>
            )
          })}
        </>
      ) : null}
    </>
  )
}

export default DriveNav
