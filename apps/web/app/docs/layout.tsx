import type { ReactNode } from "react"
import AppShell from "@components/AppShell/AppShell"
import SuiteTitleBar from "@components/SuiteTitleBar/SuiteTitleBar"
import DocsSidebar from "@pages/Docs/components/DocsSidebar/DocsSidebar"

const Layout = ({ children }: { children: ReactNode }) => (
  <AppShell
    sidebar={<DocsSidebar />}
    titleBar={<SuiteTitleBar searchPlaceholder="Search Docs" />}
  >
    {children}
  </AppShell>
)

export default Layout
