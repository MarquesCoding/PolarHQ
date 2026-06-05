"use client"

import type { ReactNode } from "react"
import type { DocMeta } from "@lib/docs"
import { IconDownload, IconExternalLink, IconPencil, IconTrash } from "@tabler/icons-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"

export interface DocActions {
  open: (doc: DocMeta) => void
  rename: (doc: DocMeta) => void
  download: (doc: DocMeta) => void
  trash: (doc: DocMeta) => void
}

interface DocContextMenuProps {
  doc: DocMeta
  actions: DocActions
  children: ReactNode
}

const DocContextMenu = ({ doc, actions, children }: DocContextMenuProps) => (
  <ContextMenu>
    <ContextMenuTrigger className="contents" onContextMenu={(event) => event.stopPropagation()}>
      {children}
    </ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem onClick={() => actions.open(doc)}>
        <IconExternalLink />
        Open
      </ContextMenuItem>
      <ContextMenuItem onClick={() => actions.rename(doc)}>
        <IconPencil />
        Rename
      </ContextMenuItem>
      <ContextMenuItem onClick={() => actions.download(doc)}>
        <IconDownload />
        Download
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onClick={() => actions.trash(doc)}>
        <IconTrash />
        Move to trash
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
)

export default DocContextMenu
