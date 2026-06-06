"use client"

import type { ReactNode } from "react"
import type { DocType } from "@lib/docs"
import {
  IconFilePlus,
  IconFolderPlus,
  IconPresentation,
  IconTable,
  IconUpload,
} from "@tabler/icons-react"
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
}: DriveBackgroundMenuProps) => (
  <ContextMenu>
    <ContextMenuTrigger className="flex flex-1 flex-col">{children}</ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem onClick={onUpload}>
        <IconUpload />
        Upload files
      </ContextMenuItem>
      <ContextMenuItem onClick={onNewFolder}>
        <IconFolderPlus />
        New folder
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => onNew("doc")}>
        <IconFilePlus />
        New document
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onNew("sheet")}>
        <IconTable />
        New spreadsheet
      </ContextMenuItem>
      <ContextMenuItem onClick={() => onNew("slides")}>
        <IconPresentation />
        New presentation
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
)

export default DriveBackgroundMenu
