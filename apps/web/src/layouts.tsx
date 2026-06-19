import { Outlet } from "react-router"
import { useTranslation } from "react-i18next"
import { FlatShell, FlatSidebar, FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import AdminNav from "@pages/Admin/components/AdminNav/AdminNav"
import CollabNav from "@pages/Collab/CollabNav"
import CollabToolbar from "@pages/Collab/CollabToolbar"
import DocsToolbar from "@pages/Docs/components/DocsToolbar/DocsToolbar"
import DriveNav from "@pages/Drive/components/DriveNav/DriveNav"
import DriveToolbar from "@pages/Drive/components/DriveToolbar/DriveToolbar"
import PhotosNav from "@pages/Photos/components/PhotosNav/PhotosNav"
import PhotosTopBar from "@pages/Photos/components/PhotosTopBar/PhotosTopBar"

export const PhotosLayout = () => {
  const { t } = useTranslation("photos")
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("shell.product")} beta searchPlaceholder={t("shell.search")}>
          <PhotosNav />
        </FlatSidebar>
      }
      topBar={<PhotosTopBar />}
    >
      <Outlet />
    </FlatShell>
  )
}

export const DriveLayout = () => {
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
      <Outlet />
    </FlatShell>
  )
}

export const AdminLayout = () => {
  const { t } = useTranslation("admin")
  const titles: TopBarTitle[] = [
    { match: (p) => p.startsWith("/admin/users"), label: t("adminNav.users"), icon: "users" },
    { match: (p) => p.startsWith("/admin/groups"), label: t("adminNav.groups"), icon: "users-group" },
    { match: (p) => p.startsWith("/admin/roles"), label: t("adminNav.roles"), icon: "user-shield" },
    { match: (p) => p.startsWith("/admin/apps"), label: t("adminNav.apps"), icon: "apps" },
    { match: (p) => p.startsWith("/admin/limits"), label: t("adminNav.limits"), icon: "sliders" },
    { match: (p) => p.startsWith("/admin/branding"), label: t("adminNav.branding"), icon: "palette" },
    { match: (p) => p.startsWith("/admin/backup"), label: t("adminNav.backup"), icon: "database" },
    { match: (p) => p.startsWith("/admin/settings"), label: t("adminNav.settings"), icon: "settings" },
    { match: (p) => p.startsWith("/admin/audit"), label: t("adminNav.auditLog"), icon: "list" },
    { match: () => true, label: t("adminNav.overview"), icon: "gauge" },
  ]
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("shell.product")} searchPlaceholder={t("shell.search")} searchable={false}>
          <AdminNav />
        </FlatSidebar>
      }
      topBar={<FlatTopBar titles={titles} />}
    >
      <Outlet />
    </FlatShell>
  )
}

export const DocsLayout = () => {
  const { t } = useTranslation("docs")
  const titles: TopBarTitle[] = [{ match: () => true, label: t("shell.documents"), icon: "document" }]
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("shell.product")} beta searchPlaceholder={t("shell.search")}>
          <CollabNav
            type="doc"
            route="/docs"
            icon="document"
            navLabel={t("shell.myDocuments")}
            listLabel={t("shell.documents")}
          />
        </FlatSidebar>
      }
      topBar={<FlatTopBar titles={titles} extra={<DocsToolbar />} />}
    >
      <Outlet />
    </FlatShell>
  )
}

export const SheetsLayout = () => {
  const { t } = useTranslation("sheets")
  const titles: TopBarTitle[] = [{ match: () => true, label: t("shell.spreadsheets"), icon: "table" }]
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("shell.product")} beta searchPlaceholder={t("shell.search")}>
          <CollabNav
            type="sheet"
            route="/sheets"
            icon="table"
            navLabel={t("shell.mySpreadsheets")}
            listLabel={t("shell.spreadsheets")}
          />
        </FlatSidebar>
      }
      topBar={
        <FlatTopBar
          titles={titles}
          extra={<CollabToolbar type="sheet" route="/sheets" createLabel={t("shell.newSpreadsheet")} />}
        />
      }
    >
      <Outlet />
    </FlatShell>
  )
}

export const WhiteboardsLayout = () => {
  const { t } = useTranslation("whiteboard")
  const titles: TopBarTitle[] = [{ match: () => true, label: t("shell.whiteboards"), icon: "palette" }]
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("shell.product")} beta searchPlaceholder={t("shell.search")}>
          <CollabNav
            type="board"
            route="/whiteboards"
            icon="palette"
            navLabel={t("shell.myWhiteboards")}
            listLabel={t("shell.whiteboards")}
          />
        </FlatSidebar>
      }
      topBar={
        <FlatTopBar
          titles={titles}
          extra={<CollabToolbar type="board" route="/whiteboards" createLabel={t("shell.newWhiteboard")} />}
        />
      }
    >
      <Outlet />
    </FlatShell>
  )
}
