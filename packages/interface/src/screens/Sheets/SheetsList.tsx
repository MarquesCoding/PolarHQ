"use client"

import { useTranslation } from "react-i18next"

import CollabList from "@polarhq/interface/screens/Collab/CollabList"

const SheetsList = () => {
  const { t } = useTranslation("sheets")

  return (
    <CollabList
      type="sheet"
      route="/sheets"
      iconName="table"
      title={t("sheetsList.title")}
      createLabel={t("sheetsList.createLabel")}
    />
  )
}

export default SheetsList
