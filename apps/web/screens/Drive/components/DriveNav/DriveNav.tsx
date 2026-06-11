"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  deleteSavedSearch,
  driveFolderIdFromPath,
  fetchNodes,
  fetchSavedSearches,
} from "@lib/drive"
import { Icon } from "@lib/icons"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { cn } from "@workspace/ui/lib/utils"
import { NavRow, SectionLabel, navRowClass } from "@components/FlatShell"

const isMyDrive = (pathname: string): boolean =>
  /^\/drive\/[^/]+$/.test(pathname) &&
  pathname !== "/drive/trash" &&
  pathname !== "/drive/overview" &&
  pathname !== "/drive/recent" &&
  pathname !== "/drive/favorites"

const FILE_KINDS: { kind: string; icon: string }[] = [
  { kind: "image", icon: "photo" },
  { kind: "video", icon: "video" },
  { kind: "audio", icon: "music" },
  { kind: "document", icon: "document" },
  { kind: "archive", icon: "file-zip" },
]

/** Drive nav: Overview / My Drive / Recents / Trash, the File-kinds smart views, and the current
 *  folder's location trail. */
const DriveNav = () => {
  const { t } = useTranslation("drive")
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const folderId = driveFolderIdFromPath(pathname)
  const { data } = useQuery({
    queryKey: ["drive", "nodes", folderId ?? "root"],
    queryFn: () => fetchNodes(folderId ?? undefined),
    enabled: folderId !== null,
  })
  const { data: searches = [] } = useQuery({
    queryKey: ["drive", "searches"],
    queryFn: fetchSavedSearches,
  })
  const trail = data?.breadcrumb ?? []
  const showLocation = folderId !== null && trail.length > 1

  const removeSearch = async (id: string) => {
    await deleteSavedSearch(id)
    void queryClient.invalidateQueries({ queryKey: ["drive", "searches"] })
  }

  return (
    <>
      <SectionLabel>{t("driveNav.drive")}</SectionLabel>
      <NavRow href="/drive" icon="gauge" label={t("driveNav.overview")} active={pathname === "/drive"} />
      <NavRow
        href="/drive/files"
        icon="folder"
        label={t("driveNav.myDrive")}
        active={isMyDrive(pathname)}
      />
      <NavRow
        href="/drive/recent"
        icon="calendar"
        label={t("driveNav.recents")}
        active={pathname === "/drive/recent"}
      />
      <NavRow
        href="/drive/favorites"
        icon="favourites"
        label={t("driveNav.favorites")}
        active={pathname === "/drive/favorites"}
      />
      <NavRow href="/drive/trash" icon="trash" label={t("driveNav.trash")} active={pathname === "/drive/trash"} />

      <SectionLabel>{t("driveNav.fileKinds")}</SectionLabel>
      {FILE_KINDS.map(({ kind, icon }) => (
        <NavRow
          key={kind}
          href={`/drive/kind/${kind}`}
          icon={icon}
          label={t(`overview.kinds.${kind}`)}
          active={pathname === `/drive/kind/${kind}`}
          compact
        />
      ))}

      {searches.length > 0 ? (
        <>
          <SectionLabel>{t("driveNav.savedSearches")}</SectionLabel>
          {searches.map((search) => {
            const active = pathname === `/drive/search/${search.id}`
            return (
              <div key={search.id} className="group/sr relative flex items-center">
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
              </div>
            )
          })}
        </>
      ) : null}

      {showLocation ? (
        <>
          <SectionLabel>{t("driveNav.location")}</SectionLabel>
          {trail.map((node, index) => (
            <Link
              key={node.id}
              href={index === 0 ? "/drive/files" : `/drive/${node.id}`}
              style={{ paddingLeft: `${0.625 + index * 0.85}rem` }}
              className={cn(
                "flex items-center gap-1.5 rounded-md py-1 pr-2 text-[13px] transition",
                index === trail.length - 1
                  ? "bg-sidebar-accent/60 font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/40",
              )}
            >
              <Icon name="folder" className="size-3.5 shrink-0" />
              <span className="truncate">{index === 0 ? t("driveNav.myDrive") : node.name}</span>
            </Link>
          ))}
        </>
      ) : null}
    </>
  )
}

export default DriveNav
