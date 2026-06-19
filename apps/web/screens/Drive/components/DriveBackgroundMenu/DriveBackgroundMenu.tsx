"use client"

import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import type { DocType } from "@workspace/core/docs"
import { FilePlus, FolderPlus, Table, UploadSimple } from "@phosphor-icons/react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"

interface DriveBackgroundMenuProps {
  onUpload: () => void
  onNewFolder: () => void
  onNew: (type: DocType) => void
  children: ReactNode
}

/** Right-click menu for the empty Drive area: upload, create a folder, or create a document/sheet/deck. */
const DriveBackgroundMenu = ({
  onUpload,
  onNewFolder,
  onNew,
  children,
}: DriveBackgroundMenuProps) => {
  const { t } = useTranslation("drive")

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex flex-1 flex-col">{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={onUpload}>
          <UploadSimple />
          {t("driveBackgroundMenu.uploadFiles")}
        </ContextMenuItem>
        <ContextMenuItem onClick={onNewFolder}>
          <FolderPlus />
          {t("driveBackgroundMenu.newFolder")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => onNew("doc")}>
          <FilePlus />
          {t("driveBackgroundMenu.newDocument")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onNew("sheet")}>
          <Table />
          {t("driveBackgroundMenu.newSpreadsheet")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default DriveBackgroundMenu
