"use client"

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { FlatShell, FlatSidebar, FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import AdminNav from "@pages/Admin/components/AdminNav/AdminNav"

const Layout = ({ children }: { children: ReactNode }) => {
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
      {children}
    </FlatShell>
  )
}

export default Layout
