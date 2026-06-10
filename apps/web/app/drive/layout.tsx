"use client"

import type { ReactNode } from "react"
import { FlatShell, FlatSidebar, FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import DriveNav from "@pages/Drive/components/DriveNav/DriveNav"
import DriveToolbar from "@pages/Drive/components/DriveToolbar/DriveToolbar"

const TITLES: TopBarTitle[] = [
  { match: (p) => p === "/drive/trash", label: "Trash", icon: "trash" },
  { match: () => true, label: "My Drive", icon: "folder" },
]

const Layout = ({ children }: { children: ReactNode }) => (
  <FlatShell
    sidebar={
      <FlatSidebar productName="Drive" beta searchPlaceholder="Search Drive">
        <DriveNav />
      </FlatSidebar>
    }
    topBar={<FlatTopBar titles={TITLES} extra={<DriveToolbar />} />}
  >
    {children}
  </FlatShell>
)

export default Layout
