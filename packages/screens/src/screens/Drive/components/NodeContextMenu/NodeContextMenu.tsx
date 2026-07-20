import { type ReactNode, useState } from "react"
import { useNavigation } from "@workspace/screens/platform"
import { useTranslation } from "react-i18next"
import { type DriveNode, isArchiveName } from "@workspace/core/drive"
import { useNodeTags } from "@pages/Drive/components/tags/useNodeTags"
import TagCreateDialog from "@pages/Drive/components/tags/TagCreateDialog"
import { getHost } from "@workspace/core/host"
import { docTypeOf } from "@workspace/core/docs"
import { officeTypeForName } from "@workspace/screens/importFlow"
import { is3DModelName } from "@workspace/screens/model3dExt"
import {
  ArrowsOutCardinal,
  ArrowSquareOut,
  ClockCounterClockwise,
  Copy,
  Cube,
  DownloadSimple,
  Export,
  Eye,
  Image as ImageIcon,
  Check,
  Info,
  Link,
  Lock,
  LockOpen,
  PencilSimple,
  Plus,
  Star,
  Tag,
  Trash,
  UserPlus,
} from "@phosphor-icons/react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"

export interface DriveNodeActions {
  open: (node: DriveNode) => void
  view: (node: DriveNode) => void
  generate3d?: (node: DriveNode) => void
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
  const router = useNavigation()
  const { t } = useTranslation("drive")
  const [tagDialog, setTagDialog] = useState(false)
  const tagCtl = useNodeTags(node)
  const isFile = node.kind === "file"
  const isImage = isFile && Boolean(node.mimeType?.startsWith("image/"))
  const is3D = isFile && is3DModelName(node.name)
  const canGenerate3d =
    isImage && Boolean(actions.generate3d) && getHost().isDesktop && Boolean(getHost().generateSplat)

  return (
    <>
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
                <ImageIcon />
                {t("nodeContextMenu.openInPhotos")}
              </ContextMenuItem>
            ) : null}
            <ContextMenuItem onClick={() => actions.details(node)}>
              <Info />
              {t("nodeContextMenu.details")}
            </ContextMenuItem>
          </>
        ) : (
          <>
            {docTypeOf(node.mimeType) || officeTypeForName(node.name) ? (
              <ContextMenuItem onClick={() => actions.open(node)}>
                <ArrowSquareOut />
                {t("nodeContextMenu.open")}
              </ContextMenuItem>
            ) : null}
            {isImage || is3D ? (
              <ContextMenuItem onClick={() => actions.view(node)}>
                <Eye />
                {is3D ? t("nodeContextMenu.viewIn3d") : t("nodeContextMenu.view")}
              </ContextMenuItem>
            ) : null}
            {canGenerate3d ? (
              <ContextMenuItem onClick={() => actions.generate3d?.(node)}>
                <Cube />
                {t("nodeContextMenu.generate3d")}
              </ContextMenuItem>
            ) : null}
            {isFile ? (
              <>
                <ContextMenuItem onClick={() => actions.download(node)}>
                  <DownloadSimple />
                  {t("nodeContextMenu.download")}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => actions.copyLink(node)}>
                  <Link />
                  {t("nodeContextMenu.copyLink")}
                </ContextMenuItem>
                <ContextMenuItem onClick={() => actions.share(node)}>
                  <UserPlus />
                  {t("nodeContextMenu.share")}
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            ) : null}
            <ContextMenuItem onClick={() => actions.favorite(node)}>
              {node.favorite ? <Star weight="fill" /> : <Star />}
              {node.favorite ? t("nodeContextMenu.unfavorite") : t("nodeContextMenu.favorite")}
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Tag />
                {t("nodeContextMenu.tags", { defaultValue: "Tags" })}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {tagCtl.allTags.map((tag) => (
                  <ContextMenuItem
                    key={tag.id}
                    closeOnClick={false}
                    onClick={() => void tagCtl.toggle(tag)}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 truncate">{tag.name}</span>
                    {tagCtl.applied.has(tag.id) ? <Check className="size-3.5" /> : null}
                  </ContextMenuItem>
                ))}
                {tagCtl.allTags.length > 0 ? <ContextMenuSeparator /> : null}
                <ContextMenuItem onClick={() => setTagDialog(true)}>
                  <Plus />
                  {t("nodeContextMenu.newTag", { defaultValue: "New tag…" })}
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem onClick={() => actions.move(node)}>
              <ArrowsOutCardinal />
              {t("nodeContextMenu.moveToFolder")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => actions.copy(node)}>
              <Copy />
              {t("nodeContextMenu.makeCopy")}
            </ContextMenuItem>
            {isFile && !node.encrypted && isArchiveName(node.name) ? (
              <ContextMenuItem onClick={() => actions.extract(node)}>
                <Export />
                {t("nodeContextMenu.extractHere")}
              </ContextMenuItem>
            ) : null}
            {!isFile && !node.special ? (
              node.locked ? (
                <ContextMenuItem onClick={() => actions.removeLock(node)}>
                  <LockOpen />
                  {t("nodeContextMenu.removeLock")}
                </ContextMenuItem>
              ) : (
                <ContextMenuItem onClick={() => actions.lock(node)}>
                  <Lock />
                  {t("nodeContextMenu.lockFolder")}
                </ContextMenuItem>
              )
            ) : null}
            <ContextMenuItem onClick={() => actions.rename(node)}>
              <PencilSimple />
              {t("nodeContextMenu.rename")}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => actions.details(node)}>
              <Info />
              {t("nodeContextMenu.details")}
            </ContextMenuItem>
            {isFile ? (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => actions.versions(node)}>
                  <ClockCounterClockwise />
                  {t("nodeContextMenu.versionHistory")}
                </ContextMenuItem>
              </>
            ) : null}
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => actions.trash(node)}>
              <Trash />
              {t("nodeContextMenu.moveToTrash")}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
    <TagCreateDialog open={tagDialog} onOpenChange={setTagDialog} onCreate={tagCtl.create} />
    </>
  )
}

export default NodeContextMenu
