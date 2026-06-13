"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { type DocMeta, type DocType, fetchDocs, openEditor } from "@lib/docs"
import { trashDriveNode } from "@lib/drive"
import { createEncryptedDoc } from "@lib/e2e"
import { Icon } from "@lib/icons"
import { usePersistentNumber } from "@lib/persistentSetting"
import { SelectionProvider, useSelection } from "@lib/selection"
import { useArmedConfirm } from "@lib/useArmedConfirm"
import { useSelectionHotkeys } from "@lib/useSelectionHotkeys"
import { useAppSelector } from "@store/hooks"
import { IconPencil, IconPlus } from "@tabler/icons-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@polarhq/ui/components/button"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import SelectionBar from "@components/SelectionBar/SelectionBar"
import { PageSpinner } from "@components/Spinner/Spinner"
import DocCard from "@pages/Docs/components/DocCard/DocCard"
import DocContextMenu, { type DocActions } from "@pages/Docs/components/DocContextMenu/DocContextMenu"
import RenameDialog from "@pages/Drive/components/RenameDialog/RenameDialog"

const download = (doc: DocMeta) => {
  const anchor = document.createElement("a")
  anchor.href = doc.downloadUrl
  anchor.download = doc.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

export interface CollabListConfig {
  type: DocType
  route: string
  iconName: string
  title: string
  createLabel: string
}

const CollabListInner = ({ type, iconName, title, createLabel }: CollabListConfig) => {
  const { t } = useTranslation("collab")
  const router = useRouter()
  const queryClient = useQueryClient()
  const selection = useSelection()
  const search = useAppSelector((state) => state.ui.searchQuery).trim().toLowerCase()
  const [tileSize] = usePersistentNumber(`${type}.tileSize`, 150)
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<DocMeta | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ["docs", type], queryFn: () => fetchDocs(type) })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["docs"] })
    void queryClient.invalidateQueries({ queryKey: ["drive"] })
  }

  const matches = (doc: DocMeta) => !search || doc.name.toLowerCase().includes(search)
  const owned = (data?.documents ?? []).filter(matches)
  const shared = (data?.shared ?? []).filter(matches)
  const all = [...owned, ...shared]
  const ordered = all.map((doc) => doc.id)
  const byId = new Map(all.map((doc) => [doc.id, doc]))

  const create = async () => {
    setCreating(true)
    try {
      const doc = await createEncryptedDoc(null, type)
      invalidate()
      openEditor(type, doc.id, router)
    } catch {
      toast.error(t("collabList.createFailed"))
      setCreating(false)
    }
  }

  const select = (doc: DocMeta, shiftKey: boolean, additive: boolean) => {
    if (shiftKey) selection.rangeTo(doc.id, ordered)
    else if (additive) selection.toggle(doc.id, ordered)
    else selection.selectOnly(doc.id)
  }

  const trash = async (ids: string[]) => {
    const toTrash = ids.filter((id) => byId.get(id)?.owner)
    if (toTrash.length === 0) return
    try {
      await Promise.all(toTrash.map((id) => trashDriveNode(id)))
      toast.success(t("collabList.movedToTrash"))
      selection.clear()
      invalidate()
    } catch {
      toast.error(t("collabList.deleteFailed"))
    }
  }

  const ids = [...selection.selected]
  const single = ids.length === 1 ? byId.get(ids[0]!) : undefined

  const actions: DocActions = {
    open: (doc) => openEditor(type, doc.id, router),
    rename: (doc) => setRenaming(doc),
    download: (doc) => download(doc),
    trash: (doc) => void trash([doc.id]),
  }

  const trashConfirm = useArmedConfirm(() => void trash(ids))
  useSelectionHotkeys({ active: selection.count > 0, onClear: selection.clear, confirm: trashConfirm })

  const grid = (items: DocMeta[]) => (
    <div
      className="grid justify-start gap-2"
      style={{ gridTemplateColumns: `repeat(auto-fill, ${tileSize}px)` }}
    >
      {items.map((doc) => (
        <DocContextMenu key={doc.id} doc={doc} actions={actions}>
          <DocCard
            doc={doc}
            iconName={iconName}
            selected={selection.isSelected(doc.id)}
            onOpen={(value) => openEditor(type, value.id, router)}
            onSelect={select}
            onToggle={(value) => selection.toggle(value.id, ordered)}
          />
        </DocContextMenu>
      ))}
    </div>
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      {isLoading ? (
        <PageSpinner />
      ) : all.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Icon name={iconName} className="size-8" />
          <p className="text-sm">{search ? t("collabList.noMatches") : t("collabList.empty")}</p>
          {!search ? (
            <Button size="sm" disabled={creating} onClick={create}>
              <IconPlus className="size-4" />
              {createLabel}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {owned.length > 0 ? grid(owned) : null}
          {shared.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-muted-foreground text-sm font-medium">{t("collabList.sharedWithMe")}</h2>
              {grid(shared)}
            </div>
          ) : null}
        </div>
      )}

      <SelectionBar>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => ids.forEach((id) => byId.get(id) && download(byId.get(id)!))}
        >
          <Icon name="download" className="size-4" />
          {t("collabList.download")}
        </Button>
        {single?.owner ? (
          <Button variant="ghost" size="sm" onClick={() => setRenaming(single)}>
            <IconPencil className="size-4" />
            {t("collabList.rename")}
          </Button>
        ) : null}
        <ConfirmButton
          icon={<Icon name="trash" className="size-4" />}
          armed={trashConfirm.armed}
          onTrigger={trashConfirm.trigger}
        >
          {t("collabList.trash")}
        </ConfirmButton>
      </SelectionBar>

      <RenameDialog
        node={renaming}
        onOpenChange={(value) => !value && setRenaming(null)}
        onDone={invalidate}
      />
    </div>
  )
}

/** A grid of collaborative documents of one type (Docs, Sheets). */
const CollabList = (config: CollabListConfig) => (
  <SelectionProvider>
    <CollabListInner {...config} />
  </SelectionProvider>
)

export default CollabList
