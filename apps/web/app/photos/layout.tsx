"use client"

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { FlatShell, FlatSidebar } from "@components/FlatShell"
import PhotosNav from "@pages/Photos/components/PhotosNav/PhotosNav"
import PhotosTopBar from "@pages/Photos/components/PhotosTopBar/PhotosTopBar"

const Layout = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation("photos")
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("shell.product")} beta>
          <PhotosNav />
        </FlatSidebar>
      }
      topBar={<PhotosTopBar />}
    >
      {children}
    </FlatShell>
  )
}

export default Layout
