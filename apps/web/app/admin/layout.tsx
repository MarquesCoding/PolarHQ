"use client"

import type { ReactNode } from "react"
import { FlatShell, FlatSidebar, FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import AdminNav from "@pages/Admin/components/AdminNav/AdminNav"

const TITLES: TopBarTitle[] = [
  { match: (p) => p.startsWith("/admin/users"), label: "Users", icon: "users" },
  { match: (p) => p.startsWith("/admin/groups"), label: "Groups", icon: "users-group" },
  { match: (p) => p.startsWith("/admin/workgroups"), label: "Workgroups", icon: "buildings" },
  { match: (p) => p.startsWith("/admin/roles"), label: "Roles", icon: "user-shield" },
  { match: (p) => p.startsWith("/admin/apps"), label: "Apps", icon: "apps" },
  { match: (p) => p.startsWith("/admin/limits"), label: "Limits", icon: "sliders" },
  { match: (p) => p.startsWith("/admin/branding"), label: "Branding", icon: "palette" },
  { match: (p) => p.startsWith("/admin/backup"), label: "Backup", icon: "database" },
  { match: (p) => p.startsWith("/admin/settings"), label: "Settings", icon: "settings" },
  { match: (p) => p.startsWith("/admin/audit"), label: "Audit log", icon: "list" },
  { match: () => true, label: "Overview", icon: "gauge" },
]

const Layout = ({ children }: { children: ReactNode }) => (
  <FlatShell
    sidebar={
      <FlatSidebar productName="Admin" searchPlaceholder="Search" searchable={false}>
        <AdminNav />
      </FlatSidebar>
    }
    topBar={<FlatTopBar titles={TITLES} />}
  >
    {children}
  </FlatShell>
)

export default Layout
