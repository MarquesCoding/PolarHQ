import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import type { DocMeta } from "@workspace/core/docs"
import { ArrowSquareOut, DownloadSimple, PencilSimple, Trash } from "@phosphor-icons/react"
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

const DocContextMenu = ({ doc, actions, children }: DocContextMenuProps) => {
  const { t } = useTranslation("docs")
  return (
    <ContextMenu>
      <ContextMenuTrigger className="contents" onContextMenu={(event) => event.stopPropagation()}>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => actions.open(doc)}>
          <ArrowSquareOut />
          {t("docContextMenu.open")}
        </ContextMenuItem>
        {doc.owner ? (
          <ContextMenuItem onClick={() => actions.rename(doc)}>
            <PencilSimple />
            {t("docContextMenu.rename")}
          </ContextMenuItem>
        ) : null}
        <ContextMenuItem onClick={() => actions.download(doc)}>
          <DownloadSimple />
          {t("docContextMenu.download")}
        </ContextMenuItem>
        {doc.owner ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem variant="destructive" onClick={() => actions.trash(doc)}>
              <Trash />
              {t("docContextMenu.moveToTrash")}
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export default DocContextMenu
