import type { ReactNode } from "react"
import AppShell from "@components/AppShell/AppShell"
import SuiteTitleBar from "@components/SuiteTitleBar/SuiteTitleBar"
import AdminSidebar from "@pages/Admin/components/AdminSidebar/AdminSidebar"

const Layout = ({ children }: { children: ReactNode }) => (
  <AppShell sidebar={<AdminSidebar />} titleBar={<SuiteTitleBar searchPlaceholder="Search" />}>
    {children}
  </AppShell>
)

export default Layout
