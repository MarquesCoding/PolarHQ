"use client"

import type { ReactNode } from "react"
import { useRouter } from "@lib/router"
import { useTranslation } from "react-i18next"
import { type DriveNode, isArchiveName } from "@lib/drive"
import { docTypeOf } from "@lib/docs"
import { officeTypeForName } from "@lib/importFlow"
import { is3DModelName } from "@polarhq/core/model3dExt"
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
  IconStar,
  IconStarFilled,
  IconTrash,
  IconUserPlus,
} from "@tabler/icons-react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@polarhq/ui/components/context-menu"

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
  favorite: (node: DriveNode) => void
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
  const { t } = useTranslation("drive")
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
                {t("nodeContextMenu.openInPhotos")}
              </ContextMenuItem>
            ) : null}
            <ContextMenuItem onClick={() => actions.details(node)}>
              <IconInfoCircle />
              {t("nodeContextMenu.details")}
            </ContextMenuItem>
          </>
        ) : (
          <>
            {docTypeOf(node.mimeType) || officeTypeForName(node.name) ? (
              <ContextMenuItem onClick={() => actions.open(node)}>
                <IconExternalLink />
                {t("nodeContextMenu.open")}
              </ContextMenuItem>
            ) : null}
            {isImage || is3D ? (
              <ContextMenuItem onClick={() => actions.view(node)}>
                <IconEye />
                {is3D ? t("nodeContextMenu.viewIn3d") : t("nodeContextMenu.view")}
              </ContextMenuItem>
            ) : null}
            {isFile ? (
              <>
                <ContextMenuItem onClick={() => actions.download(node)}>
                  <IconDownload />
                  {t("nodeContextMenu.download")}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => actions.copyLink(node)}>
                  <IconLink />
                  {t("nodeContextMenu.copyLink")}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => actions.share(node)}>
                  <IconUserPlus />
                  {t("nodeContextMenu.share")}
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            ) : null}
            <ContextMenuItem onClick={() => actions.favorite(node)}>
              {node.favorite ? <IconStarFilled /> : <IconStar />}
              {node.favorite ? t("nodeContextMenu.unfavorite") : t("nodeContextMenu.favorite")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => actions.move(node)}>
              <IconArrowsMove />
              {t("nodeContextMenu.moveToFolder")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => actions.copy(node)}>
              <IconCopy />
              {t("nodeContextMenu.makeCopy")}
            </ContextMenuItem>
            {isFile && !node.encrypted && isArchiveName(node.name) ? (
              <ContextMenuItem onClick={() => actions.extract(node)}>
                <IconFileExport />
                {t("nodeContextMenu.extractHere")}
              </ContextMenuItem>
            ) : null}
            {!isFile && !node.special ? (
              node.locked ? (
                <ContextMenuItem onClick={() => actions.removeLock(node)}>
                  <IconLockOpen />
                  {t("nodeContextMenu.removeLock")}
                </ContextMenuItem>
              ) : (
                <ContextMenuItem onClick={() => actions.lock(node)}>
                  <IconLock />
                  {t("nodeContextMenu.lockFolder")}
                </ContextMenuItem>
              )
            ) : null}
            <ContextMenuItem onClick={() => actions.rename(node)}>
              <IconPencil />
              {t("nodeContextMenu.rename")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => actions.details(node)}>
              <IconInfoCircle />
              {t("nodeContextMenu.details")}
            </ContextMenuItem>
            {isFile ? (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => actions.versions(node)}>
                  <IconHistory />
                  {t("nodeContextMenu.versionHistory")}
                </ContextMenuItem>
              </>
            ) : null}
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => actions.trash(node)}>
              <IconTrash />
              {t("nodeContextMenu.moveToTrash")}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default NodeContextMenu
