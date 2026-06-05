"use client"

import type { ReactNode } from "react"
import type { DriveNode } from "@lib/drive"
import {
  IconArrowsMove,
  IconCopy,
  IconDownload,
  IconEye,
  IconHistory,
  IconInfoCircle,
  IconLink,
  IconPencil,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"

export interface DriveNodeActions {
  view: (node: DriveNode) => void
  download: (node: DriveNode) => void
  copyLink: (node: DriveNode) => void
  share: (node: DriveNode) => void
  move: (node: DriveNode) => void
  copy: (node: DriveNode) => void
  rename: (node: DriveNode) => void
  details: (node: DriveNode) => void
  versions: (node: DriveNode) => void
  trash: (node: DriveNode) => void
}

interface NodeContextMenuProps {
  node: DriveNode
  actions: DriveNodeActions
  children: ReactNode
}

const NodeContextMenu = ({ node, actions, children }: NodeContextMenuProps) => {
  const isFile = node.kind === "file"
  const isImage = isFile && Boolean(node.mimeType?.startsWith("image/"))

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className="contents"
        onContextMenu={(event) => event.stopPropagation()}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {node.special ? (
          <ContextMenuItem onClick={() => actions.details(node)}>
            <IconInfoCircle />
            Details
          </ContextMenuItem>
        ) : (
          <>
            {isImage ? (
              <ContextMenuItem onClick={() => actions.view(node)}>
                <IconEye />
                View
              </ContextMenuItem>
            ) : null}
            {isFile ? (
              <>
                <ContextMenuItem onClick={() => actions.download(node)}>
                  <IconDownload />
                  Download
                </ContextMenuItem>
                <ContextMenuItem onClick={() => actions.copyLink(node)}>
                  <IconLink />
                  Copy link
                </ContextMenuItem>
                <ContextMenuItem onClick={() => actions.share(node)}>
                  <IconUserPlus />
                  Share
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            ) : null}
            <ContextMenuItem onClick={() => actions.move(node)}>
              <IconArrowsMove />
              Move to folder
            </ContextMenuItem>
            <ContextMenuItem onClick={() => actions.copy(node)}>
              <IconCopy />
              Make a copy
            </ContextMenuItem>
            <ContextMenuItem onClick={() => actions.rename(node)}>
              <IconPencil />
              Rename
            </ContextMenuItem>
            <ContextMenuItem onClick={() => actions.details(node)}>
              <IconInfoCircle />
              Details
            </ContextMenuItem>
            {isFile ? (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => actions.versions(node)}>
                  <IconHistory />
                  See version history
                </ContextMenuItem>
              </>
            ) : null}
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => actions.trash(node)}>
              <IconTrash />
              Move to trash
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default NodeContextMenu
