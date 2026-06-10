import type { ReactNode } from "react"
import AppShell from "@components/AppShell/AppShell"
import SuiteTitleBar from "@components/SuiteTitleBar/SuiteTitleBar"
import CollabSidebar from "@pages/Collab/CollabSidebar"
import CollabToolbar from "@pages/Collab/CollabToolbar"

const Layout = ({ children }: { children: ReactNode }) => (
  <AppShell
    sidebar={
      <CollabSidebar
        type="board"
        route="/whiteboards"
        productName="Whiteboard"
        icon="palette"
        navLabel="My Whiteboards"
        listLabel="Whiteboards"
      />
    }
    titleBar={
      <SuiteTitleBar
        searchPlaceholder="Search Whiteboards"
        extra={<CollabToolbar type="board" route="/whiteboards" createLabel="New whiteboard" />}
      />
    }
  >
    {children}
  </AppShell>
)

export default Layout
