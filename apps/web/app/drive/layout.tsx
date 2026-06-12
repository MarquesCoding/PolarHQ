"use client"

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { FlatShell, FlatSidebar, FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import DriveNav from "@pages/Drive/components/DriveNav/DriveNav"
import DriveToolbar from "@pages/Drive/components/DriveToolbar/DriveToolbar"

const Layout = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation("drive")
  const kindIcons: Record<string, string> = {
    image: "photo",
    video: "video",
    audio: "music",
    document: "document",
    archive: "file-zip",
    other: "file-text",
  }
  const titles: TopBarTitle[] = [
    { match: (p) => p === "/drive/trash", label: t("driveNav.trash"), icon: "trash" },
    { match: (p) => p === "/drive/recent", label: t("driveNav.recents"), icon: "calendar" },
    { match: (p) => p === "/drive/favorites", label: t("driveNav.favorites"), icon: "favourites" },
    ...Object.entries(kindIcons).map(([kind, icon]) => ({
      match: (p: string) => p === `/drive/kind/${kind}`,
      label: t(`overview.kinds.${kind}`),
      icon,
    })),
    { match: (p) => p === "/drive", label: t("driveNav.overview"), icon: "gauge" },
    { match: () => true, label: t("driveNav.myDrive"), icon: "folder" },
  ]
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("driveNav.drive")} beta searchPlaceholder={t("shell.search")}>
          <DriveNav />
        </FlatSidebar>
      }
      topBar={<FlatTopBar titles={titles} extra={<DriveToolbar />} />}
    >
      {children}
    </FlatShell>
  )
}

export default Layout
