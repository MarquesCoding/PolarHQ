"use client"

import type { ReactNode } from "react"
import { FlatShell, FlatSidebar, FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import CollabNav from "@pages/Collab/CollabNav"
import CollabToolbar from "@pages/Collab/CollabToolbar"

const TITLES: TopBarTitle[] = [{ match: () => true, label: "Spreadsheets", icon: "table" }]

const Layout = ({ children }: { children: ReactNode }) => (
  <FlatShell
    sidebar={
      <FlatSidebar productName="Sheets" beta searchPlaceholder="Search Sheets">
        <CollabNav
          type="sheet"
          route="/sheets"
          icon="table"
          navLabel="My Spreadsheets"
          listLabel="Spreadsheets"
        />
      </FlatSidebar>
    }
    topBar={
      <FlatTopBar
        titles={TITLES}
        extra={<CollabToolbar type="sheet" route="/sheets" createLabel="New spreadsheet" />}
      />
    }
  >
    {children}
  </FlatShell>
)

export default Layout
