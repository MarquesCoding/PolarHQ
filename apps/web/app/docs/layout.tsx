"use client"

import type { ReactNode } from "react"
import { FlatShell, FlatSidebar, FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import CollabNav from "@pages/Collab/CollabNav"
import DocsToolbar from "@pages/Docs/components/DocsToolbar/DocsToolbar"

const TITLES: TopBarTitle[] = [{ match: () => true, label: "Documents", icon: "document" }]

const Layout = ({ children }: { children: ReactNode }) => (
  <FlatShell
    sidebar={
      <FlatSidebar productName="Docs" beta searchPlaceholder="Search Docs">
        <CollabNav
          type="doc"
          route="/docs"
          icon="document"
          navLabel="My Documents"
          listLabel="Documents"
        />
      </FlatSidebar>
    }
    topBar={<FlatTopBar titles={TITLES} extra={<DocsToolbar />} />}
  >
    {children}
  </FlatShell>
)

export default Layout
