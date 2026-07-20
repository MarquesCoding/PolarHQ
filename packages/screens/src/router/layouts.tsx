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
import DriveTopToolbar from "@pages/Drive/components/DriveTopToolbar/DriveTopToolbar"
import PhotosNav from "@pages/Photos/components/PhotosNav/PhotosNav"

/** Offsets floating-layout content by the sidebar width (when open) so it isn't hidden under the
 *  overlaid sidebar — the shell equivalent of the Photos grid's `sidebarInset`. An optional floating
 *  top toolbar sits above the content, within the same offset. */
const FloatingContent = ({
  topToolbar,
  children,
}: {
  topToolbar?: ReactNode
  children: ReactNode
}) => {
  const { open } = useSidebar()
  return (
    <div
      className="flex min-h-full flex-1 flex-col transition-[padding] duration-200"
      style={{ paddingLeft: open ? "var(--sidebar-width)" : undefined }}
    >
      {/* Sticky so the toolbar stays put while the grid scrolls under it. The negative margin
          counteracts flat-main's top padding so the toolbar rises into the traffic-light row
          (Finder-style); the matching sticky top keeps it there with no scroll jump. */}
      {topToolbar ? (
        <div className="fixed top-[0.25rem] z-40 shrink-0 px-1 pt-2 pb-1">{topToolbar}</div>
      ) : null}
      <div className="flex min-h-0 flex-1">{children}</div>
    </div>
  )
}

/** The Photos-style immersive shell used by every list/browse app: no top bar, floating immersive
 *  sidebar over full-window content (offset so it isn't hidden), and the app's toolbar in a floating
 *  bottom-right pill. */
const FloatingShell = ({
  productName,
  searchPlaceholder,
  nav,
  toolbar,
  topToolbar,
}: {
  productName: string
  searchPlaceholder: string
  nav: ReactNode
  /** Controls in a floating bottom-right pill (Docs/Sheets/Whiteboards). */
  toolbar?: ReactNode
  /** A floating top toolbar above the content (Drive). */
  topToolbar?: ReactNode
}) => (
  <FlatShell
    sidebar={
      <FlatSidebar productName={productName} beta searchPlaceholder={searchPlaceholder} immersive>
        {nav}
      </FlatSidebar>
    }
    topBar={null}
    floatingSidebar
  >
    <FloatingContent topToolbar={topToolbar}>
      <Outlet />
    </FloatingContent>
    {toolbar ? (
      <div className="bg-background/70 pointer-events-auto fixed right-5 bottom-5 z-[60] flex items-center gap-1 rounded-full border p-1 shadow-lg backdrop-blur-xl">
        {toolbar}
      </div>
    ) : null}
  </FlatShell>
)

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
    <FloatingShell
      productName={t("driveNav.drive")}
      searchPlaceholder={t("shell.search")}
      nav={<DriveNav />}
      topToolbar={<DriveTopToolbar />}
    />
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
  return (
    <FloatingShell
      productName={t("shell.product")}
      searchPlaceholder={t("shell.search")}
      nav={
        <CollabNav
          type="doc"
          route="/docs"
          icon="document"
          navLabel={t("shell.myDocuments")}
          listLabel={t("shell.documents")}
        />
      }
      toolbar={<DocsToolbar />}
    />
  )
}

export const SheetsLayout = () => {
  const { t } = useTranslation("sheets")
  return (
    <FloatingShell
      productName={t("shell.product")}
      searchPlaceholder={t("shell.search")}
      nav={
        <CollabNav
          type="sheet"
          route="/sheets"
          icon="table"
          navLabel={t("shell.mySpreadsheets")}
          listLabel={t("shell.spreadsheets")}
        />
      }
      toolbar={<CollabToolbar type="sheet" route="/sheets" createLabel={t("shell.newSpreadsheet")} />}
    />
  )
}

export const WhiteboardsLayout = () => {
  const { t } = useTranslation("whiteboard")
  return (
    <FloatingShell
      productName={t("shell.product")}
      searchPlaceholder={t("shell.search")}
      nav={
        <CollabNav
          type="board"
          route="/whiteboards"
          icon="palette"
          navLabel={t("shell.myWhiteboards")}
          listLabel={t("shell.whiteboards")}
        />
      }
      toolbar={<CollabToolbar type="board" route="/whiteboards" createLabel={t("shell.newWhiteboard")} />}
    />
  )
}
