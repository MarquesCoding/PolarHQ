"use client"

import type { ReactNode } from "react"
import AppShell from "@components/AppShell/AppShell"
import AppSidebar from "@pages/Photos/components/AppSidebar/AppSidebar"
import TitleBar from "@pages/Photos/components/TitleBar/TitleBar"

const PhotosShell = ({ children }: { children: ReactNode }) => (
  <AppShell sidebar={<AppSidebar />} titleBar={<TitleBar />}>
    {children}
  </AppShell>
)

export default PhotosShell
