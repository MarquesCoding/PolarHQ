"use client"

import CollabList from "@polarhq/interface/screens/Collab/CollabList"
import { useTranslation } from "react-i18next"

const WhiteboardList = () => {
  const { t } = useTranslation("whiteboard")

  return (
    <CollabList
      type="board"
      route="/whiteboards"
      iconName="palette"
      title={t("whiteboardList.title")}
      createLabel={t("whiteboardList.createLabel")}
    />
  )
}

export default WhiteboardList
