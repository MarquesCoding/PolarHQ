import type { ReactNode } from "react"
import AppShell from "@components/AppShell/AppShell"
import SuiteTitleBar from "@components/SuiteTitleBar/SuiteTitleBar"
import DriveSidebar from "@pages/Drive/components/DriveSidebar/DriveSidebar"
import DriveToolbar from "@pages/Drive/components/DriveToolbar/DriveToolbar"

const Layout = ({ children }: { children: ReactNode }) => (
  <AppShell
    sidebar={<DriveSidebar />}
    titleBar={<SuiteTitleBar searchPlaceholder="Search Drive" extra={<DriveToolbar />} />}
  >
    {children}
  </AppShell>
)

export default Layout
