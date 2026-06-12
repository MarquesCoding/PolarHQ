"use client"

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { FlatShell, FlatSidebar, FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import CollabNav from "@pages/Collab/CollabNav"
import DocsToolbar from "@pages/Docs/components/DocsToolbar/DocsToolbar"

const Layout = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation("docs")
  const titles: TopBarTitle[] = [{ match: () => true, label: t("shell.documents"), icon: "document" }]
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("shell.product")} beta searchPlaceholder={t("shell.search")}>
          <CollabNav
            type="doc"
            route="/docs"
            icon="document"
            navLabel={t("shell.myDocuments")}
            listLabel={t("shell.documents")}
          />
        </FlatSidebar>
      }
      topBar={<FlatTopBar titles={titles} extra={<DocsToolbar />} />}
    >
      {children}
    </FlatShell>
  )
}

export default Layout
