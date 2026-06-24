import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import {
  Copy,
  DownloadSimple,
  Info,
  PencilSimple,
  Star,
  Trash,
  UserPlus,
} from "@phosphor-icons/react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@workspace/ui/components/context-menu"

/**
 * Right-click menu for a single media item — used by the Lightbox (the shared Photos + Drive image
 * viewer). Every action is optional; only the ones supplied render. Mirrors the Drive
 * `NodeContextMenu` so the two surfaces feel consistent. Labels reuse the existing `lightbox.*`
 * translations.
 */
export interface PhotoMenuActions {
  favorite?: { active: boolean; toggle: () => void }
  edit?: () => void
  share?: () => void
  download?: () => void
  copy?: () => void
  info?: () => void
  trash?: () => void
}

interface PhotoContextMenuProps {
  actions: PhotoMenuActions
  children: ReactNode
}

const PhotoContextMenu = ({ actions, children }: PhotoContextMenuProps) => {
  const { t } = useTranslation("photos")
  const hasPrimary = Boolean(actions.favorite || actions.edit)
  const hasSecondary = Boolean(actions.share || actions.download || actions.copy || actions.info)

  return (
    <ContextMenu>
      <ContextMenuTrigger className="contents" onContextMenu={(event) => event.stopPropagation()}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        {actions.favorite ? (
          <ContextMenuItem onClick={actions.favorite.toggle}>
            {actions.favorite.active ? <Star weight="fill" /> : <Star />}
            {actions.favorite.active ? t("lightbox.unfavourite") : t("lightbox.favourite")}
          </ContextMenuItem>
        ) : null}
        {actions.edit ? (
          <ContextMenuItem onClick={actions.edit}>
            <PencilSimple />
            {t("lightbox.edit")}
          </ContextMenuItem>
        ) : null}
        {hasPrimary && hasSecondary ? <ContextMenuSeparator /> : null}
        {actions.share ? (
          <ContextMenuItem onClick={actions.share}>
            <UserPlus />
            {t("lightbox.share")}
          </ContextMenuItem>
        ) : null}
        {actions.download ? (
          <ContextMenuItem onClick={actions.download}>
            <DownloadSimple />
            {t("lightbox.download")}
          </ContextMenuItem>
        ) : null}
        {actions.copy ? (
          <ContextMenuItem onClick={actions.copy}>
            <Copy />
            {t("lightbox.copy")}
          </ContextMenuItem>
        ) : null}
        {actions.info ? (
          <ContextMenuItem onClick={actions.info}>
            <Info />
            {t("lightbox.info")}
          </ContextMenuItem>
        ) : null}
        {actions.trash ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={actions.trash}>
              <Trash />
              {t("lightbox.moveToTrash")}
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default PhotoContextMenu
