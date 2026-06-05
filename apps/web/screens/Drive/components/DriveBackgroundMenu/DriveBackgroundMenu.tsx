"use client"

import type { ReactNode } from "react"
import { IconFilePlus, IconFolderPlus, IconUpload } from "@tabler/icons-react"
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
  onNewDocument: () => void
  children: ReactNode
}

/** Right-click menu for the empty Drive area: upload files, create a folder, or create a document here. */
const DriveBackgroundMenu = ({
  onUpload,
  onNewFolder,
  onNewDocument,
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
      <ContextMenuItem onClick={onNewDocument}>
        <IconFilePlus />
        New document
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
)

export default DriveBackgroundMenu
