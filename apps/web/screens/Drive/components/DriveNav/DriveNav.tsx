"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { driveFolderIdFromPath, fetchNodes } from "@lib/drive"
import { Icon } from "@lib/icons"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { cn } from "@workspace/ui/lib/utils"
import { NavRow, SectionLabel } from "@components/FlatShell"

const isMyDrive = (pathname: string): boolean =>
  pathname === "/drive" || (/^\/drive\/[^/]+$/.test(pathname) && pathname !== "/drive/trash")

/** Drive nav: My Drive / Trash plus the current folder's location trail. */
const DriveNav = () => {
  const { t } = useTranslation("drive")
  const pathname = usePathname()
  const folderId = driveFolderIdFromPath(pathname)
  const { data } = useQuery({
    queryKey: ["drive", "nodes", folderId ?? "root"],
    queryFn: () => fetchNodes(folderId ?? undefined),
    enabled: folderId !== null,
  })
  const trail = data?.breadcrumb ?? []
  const showLocation = folderId !== null && trail.length > 1

  return (
    <>
      <SectionLabel>{t("driveNav.drive")}</SectionLabel>
      <NavRow href="/drive" icon="folder" label={t("driveNav.myDrive")} active={isMyDrive(pathname)} />
      <NavRow href="/drive/trash" icon="trash" label={t("driveNav.trash")} active={pathname === "/drive/trash"} />

      {showLocation ? (
        <>
          <SectionLabel>{t("driveNav.location")}</SectionLabel>
          {trail.map((node, index) => (
            <Link
              key={node.id}
              href={index === 0 ? "/drive" : `/drive/${node.id}`}
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
