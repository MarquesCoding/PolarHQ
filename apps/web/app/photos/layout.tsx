import type { ReactNode } from "react"
import PhotosShell from "@pages/Photos/components/PhotosShell/PhotosShell"

const Layout = ({ children }: { children: ReactNode }) => <PhotosShell>{children}</PhotosShell>

export default Layout
