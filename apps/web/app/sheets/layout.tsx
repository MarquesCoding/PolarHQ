import type { ReactNode } from "react"
import AppShell from "@components/AppShell/AppShell"
import SuiteTitleBar from "@components/SuiteTitleBar/SuiteTitleBar"
import CollabSidebar from "@pages/Collab/CollabSidebar"
import CollabToolbar from "@pages/Collab/CollabToolbar"

const Layout = ({ children }: { children: ReactNode }) => (
  <AppShell
    sidebar={
      <CollabSidebar
        type="sheet"
        route="/sheets"
        productName="Sheets"
        icon="table"
        navLabel="My Spreadsheets"
        listLabel="Spreadsheets"
        beta
      />
    }
    titleBar={
      <SuiteTitleBar
        searchPlaceholder="Search Sheets"
        extra={<CollabToolbar type="sheet" route="/sheets" createLabel="New spreadsheet" />}
      />
    }
  >
    {children}
  </AppShell>
)

export default Layout
