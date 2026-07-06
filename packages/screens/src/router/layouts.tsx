import type { ReactNode } from "react"
import { Outlet } from "react-router"
import { useTranslation } from "react-i18next"
import { useSidebar } from "@workspace/ui/components/sidebar"
import { FlatShell, FlatSidebar, FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import AdminNav from "@pages/Admin/components/AdminNav/AdminNav"
import CollabNav from "@pages/Collab/CollabNav"
import CollabToolbar from "@pages/Collab/CollabToolbar"
import DocsToolbar from "@pages/Docs/components/DocsToolbar/DocsToolbar"
import DriveNav from "@pages/Drive/components/DriveNav/DriveNav"
import DriveToolbar from "@pages/Drive/components/DriveToolbar/DriveToolbar"
import PhotosNav from "@pages/Photos/components/PhotosNav/PhotosNav"

/** Offsets floating-layout content by the sidebar width (when open) so it isn't hidden under the
 *  overlaid sidebar — the shell equivalent of the Photos grid's `sidebarInset`. */
const FloatingContent = ({ children }: { children: ReactNode }) => {
  const { open } = useSidebar()
  return (
    <div
      className="flex min-h-full flex-1 transition-[padding] duration-200"
      style={{ paddingLeft: open ? "var(--sidebar-width)" : undefined }}
    >
      {children}
    </div>
  )
}

export const PhotosLayout = () => {
  const { t } = useTranslation("photos")
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("shell.product")} beta searchPlaceholder={t("shell.search")} immersive>
          <PhotosNav />
        </FlatSidebar>
      }
      topBar={null}
      floatingSidebar
    >
      <Outlet />
    </FlatShell>
  )
}

export const DriveLayout = () => {
  const { t } = useTranslation("drive")
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("driveNav.drive")} beta searchPlaceholder={t("shell.search")} immersive>
          <DriveNav />
        </FlatSidebar>
      }
      topBar={null}
      floatingSidebar
    >
      <FloatingContent>
        <Outlet />
      </FloatingContent>
      <div className="bg-background/70 pointer-events-auto fixed right-5 bottom-5 z-[60] flex items-center gap-1 rounded-full border p-1 shadow-lg backdrop-blur-xl">
        <DriveToolbar />
      </div>
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
