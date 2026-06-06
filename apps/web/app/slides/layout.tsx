import type { ReactNode } from "react"
import AppShell from "@components/AppShell/AppShell"
import SuiteTitleBar from "@components/SuiteTitleBar/SuiteTitleBar"
import CollabSidebar from "@pages/Collab/CollabSidebar"
import CollabToolbar from "@pages/Collab/CollabToolbar"

const Layout = ({ children }: { children: ReactNode }) => (
  <AppShell
    sidebar={
      <CollabSidebar
        type="slides"
        route="/slides"
        productName="Presentation"
        icon="presentation"
        navLabel="My Presentations"
        listLabel="Presentations"
      />
    }
    titleBar={
      <SuiteTitleBar
        searchPlaceholder="Search Presentations"
        extra={<CollabToolbar type="slides" route="/slides" createLabel="New presentation" />}
      />
    }
  >
    {children}
  </AppShell>
)

export default Layout
