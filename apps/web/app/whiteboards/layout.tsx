"use client"

import type { ReactNode } from "react"
import { FlatShell, FlatSidebar, FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import CollabNav from "@pages/Collab/CollabNav"
import CollabToolbar from "@pages/Collab/CollabToolbar"

const TITLES: TopBarTitle[] = [{ match: () => true, label: "Whiteboards", icon: "palette" }]

const Layout = ({ children }: { children: ReactNode }) => (
  <FlatShell
    sidebar={
      <FlatSidebar productName="Whiteboard" beta searchPlaceholder="Search Whiteboards">
        <CollabNav
          type="board"
          route="/whiteboards"
          icon="palette"
          navLabel="My Whiteboards"
          listLabel="Whiteboards"
        />
      </FlatSidebar>
    }
    topBar={
      <FlatTopBar
        titles={TITLES}
        extra={<CollabToolbar type="board" route="/whiteboards" createLabel="New whiteboard" />}
      />
    }
  >
    {children}
  </FlatShell>
)

export default Layout
