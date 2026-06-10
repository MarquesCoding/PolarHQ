import type { ReactNode } from "react"
import { FlatShell, FlatSidebar } from "@components/FlatShell"
import PhotosNav from "@pages/Photos/components/PhotosNav/PhotosNav"
import PhotosTopBar from "@pages/Photos/components/PhotosTopBar/PhotosTopBar"

const Layout = ({ children }: { children: ReactNode }) => (
  <FlatShell
    sidebar={
      <FlatSidebar productName="Photos" beta searchPlaceholder="Search photos">
        <PhotosNav />
      </FlatSidebar>
    }
    topBar={<PhotosTopBar />}
  >
    {children}
  </FlatShell>
)

export default Layout
