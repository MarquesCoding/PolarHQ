"use client"

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { FlatShell, FlatSidebar, FlatTopBar, type TopBarTitle } from "@components/FlatShell"
import CollabNav from "@pages/Collab/CollabNav"
import CollabToolbar from "@pages/Collab/CollabToolbar"

const Layout = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation("whiteboard")
  const titles: TopBarTitle[] = [{ match: () => true, label: t("shell.whiteboards"), icon: "palette" }]
  return (
    <FlatShell
      sidebar={
        <FlatSidebar productName={t("shell.product")} beta>
          <CollabNav
            type="board"
            route="/whiteboards"
            icon="palette"
            navLabel={t("shell.myWhiteboards")}
            listLabel={t("shell.whiteboards")}
          />
        </FlatSidebar>
      }
      topBar={
        <FlatTopBar
          titles={titles}
          extra={<CollabToolbar type="board" route="/whiteboards" createLabel={t("shell.newWhiteboard")} />}
        />
      }
    >
      {children}
    </FlatShell>
  )
}

export default Layout
