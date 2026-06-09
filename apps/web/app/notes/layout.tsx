import type { ReactNode } from "react"
import AppShell from "@components/AppShell/AppShell"
import SuiteTitleBar from "@components/SuiteTitleBar/SuiteTitleBar"
import NotesSidebar from "@pages/Notes/components/NotesSidebar/NotesSidebar"

const Layout = ({ children }: { children: ReactNode }) => (
  <AppShell sidebar={<NotesSidebar />} titleBar={<SuiteTitleBar searchPlaceholder="Search Notes" />}>
    {children}
  </AppShell>
)

export default Layout
