"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { type DriveNode, isArchiveName } from "@lib/drive"
import { docTypeOf } from "@lib/docs"
import { officeTypeForName } from "@lib/importFlow"
import { is3DModelName } from "@lib/model3dExt"
import {
  IconArrowsMove,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconEye,
  IconFileExport,
  IconHistory,
  IconInfoCircle,
  IconLink,
  IconLock,
  IconLockOpen,
  IconPencil,
  IconPhoto,
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
  open: (node: DriveNode) => void
  view: (node: DriveNode) => void
  download: (node: DriveNode) => void
  copyLink: (node: DriveNode) => void
  share: (node: DriveNode) => void
  move: (node: DriveNode) => void
  copy: (node: DriveNode) => void
  extract: (node: DriveNode) => void
  lock: (node: DriveNode) => void
  removeLock: (node: DriveNode) => void
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
  const router = useRouter()
  const isFile = node.kind === "file"
  const isImage = isFile && Boolean(node.mimeType?.startsWith("image/"))
  const is3D = isFile && is3DModelName(node.name)

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
          <>
            {node.special === "photos" ? (
              <ContextMenuItem onClick={() => router.push("/photos")}>
                <IconPhoto />
                Open in Photos
              </ContextMenuItem>
            ) : null}
            <ContextMenuItem onClick={() => actions.details(node)}>
              <IconInfoCircle />
              Details
            </ContextMenuItem>
          </>
        ) : (
          <>
            {docTypeOf(node.mimeType) || officeTypeForName(node.name) ? (
              <ContextMenuItem onClick={() => actions.open(node)}>
                <IconExternalLink />
                Open
              </ContextMenuItem>
            ) : null}
            {isImage || is3D ? (
              <ContextMenuItem onClick={() => actions.view(node)}>
                <IconEye />
                {is3D ? "View in 3D" : "View"}
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
            {isFile && !node.encrypted && isArchiveName(node.name) ? (
              <ContextMenuItem onClick={() => actions.extract(node)}>
                <IconFileExport />
                Extract here
              </ContextMenuItem>
            ) : null}
            {!isFile && !node.special ? (
              node.locked ? (
                <ContextMenuItem onClick={() => actions.removeLock(node)}>
                  <IconLockOpen />
                  Remove lock
                </ContextMenuItem>
              ) : (
                <ContextMenuItem onClick={() => actions.lock(node)}>
                  <IconLock />
                  Lock folder
                </ContextMenuItem>
              )
            ) : null}
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
