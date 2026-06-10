"use client"

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { FlatShell, FlatSidebar, FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import CollabNav from "@pages/Collab/CollabNav"
import CollabToolbar from "@pages/Collab/CollabToolbar"

const Layout = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation("sheets")
  const titles: TopBarTitle[] = [{ match: () => true, label: t("shell.spreadsheets"), icon: "table" }]
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("shell.product")} beta searchPlaceholder={t("shell.search")}>
          <CollabNav
            type="sheet"
            route="/sheets"
            icon="table"
            navLabel={t("shell.mySpreadsheets")}
            listLabel={t("shell.spreadsheets")}
          />
        </FlatSidebar>
      }
      topBar={
        <FlatTopBar
          titles={titles}
          extra={<CollabToolbar type="sheet" route="/sheets" createLabel={t("shell.newSpreadsheet")} />}
        />
      }
    >
      {children}
    </FlatShell>
  )
}

export default Layout
