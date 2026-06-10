"use client"

import { usePathname } from "next/navigation"
import { NavRow, SectionLabel } from "@components/FlatShell"

const NAV = [
  { href: "/admin", label: "Overview", icon: "gauge" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/groups", label: "Groups", icon: "users-group" },
  { href: "/admin/workgroups", label: "Workgroups", icon: "buildings" },
  { href: "/admin/roles", label: "Roles", icon: "user-shield" },
  { href: "/admin/apps", label: "Apps", icon: "apps" },
  { href: "/admin/limits", label: "Limits", icon: "sliders" },
  { href: "/admin/branding", label: "Branding", icon: "palette" },
  { href: "/admin/backup", label: "Backup", icon: "database" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
  { href: "/admin/audit", label: "Audit log", icon: "list" },
]

const isActive = (pathname: string, href: string): boolean =>
  href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)

/** Admin console nav (Overview, Users, Apps, …) for the shared FlatSidebar. */
const AdminNav = () => {
  const pathname = usePathname()
  return (
    <>
      <SectionLabel>Console</SectionLabel>
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
