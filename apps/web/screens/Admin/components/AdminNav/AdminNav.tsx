"use client"

import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { NavRow, SectionLabel } from "@components/FlatShell"

const isActive = (pathname: string, href: string): boolean =>
  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)

/** Admin console nav (Overview, Users, Apps, …) for the shared FlatSidebar. */
const AdminNav = () => {
  const { t } = useTranslation("admin")
  const pathname = usePathname()
  const NAV = [
    { href: "/admin", label: t("adminNav.overview"), icon: "gauge" },
    { href: "/admin/users", label: t("adminNav.users"), icon: "users" },
    { href: "/admin/groups", label: t("adminNav.groups"), icon: "users-group" },
    { href: "/admin/workgroups", label: t("adminNav.workgroups"), icon: "buildings" },
    { href: "/admin/roles", label: t("adminNav.roles"), icon: "user-shield" },
    { href: "/admin/apps", label: t("adminNav.apps"), icon: "apps" },
    { href: "/admin/limits", label: t("adminNav.limits"), icon: "sliders" },
    { href: "/admin/branding", label: t("adminNav.branding"), icon: "palette" },
    { href: "/admin/backup", label: t("adminNav.backup"), icon: "database" },
    { href: "/admin/settings", label: t("adminNav.settings"), icon: "settings" },
    { href: "/admin/audit", label: t("adminNav.auditLog"), icon: "list" },
  ]
  return (
    <>
      <SectionLabel>{t("adminNav.console")}</SectionLabel>
      {NAV.map((item) => (
        <NavRow
          key={item.href}
          href={item.href}
          icon={item.icon}
          label={item.label}
          active={isActive(pathname, item.href)}
        />
      ))}
    </>
  )
}

export default AdminNav
