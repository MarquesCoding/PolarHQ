"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { type DocMeta, createDoc, fetchDocs } from "@lib/docs"
import { trashDriveNode } from "@lib/drive"
import { usePersistentNumber } from "@lib/persistentSetting"
import { SelectionProvider, useSelection } from "@lib/selection"
import { useArmedConfirm } from "@lib/useArmedConfirm"
import { useSelectionHotkeys } from "@lib/useSelectionHotkeys"
import { useAppSelector } from "@store/hooks"
import { IconFileText, IconPencil, IconPlus } from "@tabler/icons-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Icon } from "@lib/icons"
import { toast } from "sonner"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import SelectionBar from "@components/SelectionBar/SelectionBar"
import { PageSpinner } from "@components/Spinner/Spinner"
import DocCard from "@pages/Docs/components/DocCard/DocCard"
import DocContextMenu, { type DocActions } from "@pages/Docs/components/DocContextMenu/DocContextMenu"
import RenameDialog from "@pages/Drive/components/RenameDialog/RenameDialog"

const downloadDoc = (doc: DocMeta) => {
  const anchor = document.createElement("a")
  anchor.href = doc.downloadUrl
  anchor.download = doc.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

const DocsListInner = () => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const selection = useSelection()
  const search = useAppSelector((state) => state.ui.searchQuery).trim().toLowerCase()
  const [tileSize] = usePersistentNumber("docs.tileSize", 150)
  const [creating, setCreating] = useState(false)
  const [renaming, setRenaming] = useState<DocMeta | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ["docs", "list"], queryFn: fetchDocs })

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
      const doc = await createDoc()
      invalidate()
      router.push(`/docs/${doc.id}`)
    } catch {
      toast.error("Could not create document")
      setCreating(false)
    }
  }

  const select = (doc: DocMeta, shiftKey: boolean, additive: boolean) => {
    if (shiftKey) selection.rangeTo(doc.id, ordered)
    else if (additive) selection.toggle(doc.id, ordered)
    else selection.selectOnly(doc.id)
  }

  const trash = async (ids: string[]) => {
    // Only the owner can trash a document; shared ones are skipped.
    const toTrash = ids.filter((id) => byId.get(id)?.owner)
    if (toTrash.length === 0) return
    try {
      await Promise.all(toTrash.map((id) => trashDriveNode(id)))
      toast.success("Moved to trash")
      selection.clear()
      invalidate()
    } catch {
      toast.error("Could not delete")
    }
  }

  const ids = [...selection.selected]
  const single = ids.length === 1 ? byId.get(ids[0]!) : undefined

  const actions: DocActions = {
    open: (doc) => router.push(`/docs/${doc.id}`),
    rename: (doc) => setRenaming(doc),
    download: (doc) => downloadDoc(doc),
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
            selected={selection.isSelected(doc.id)}
            onOpen={(value) => router.push(`/docs/${value.id}`)}
            onSelect={select}
            onToggle={(value) => selection.toggle(value.id, ordered)}
          />
        </DocContextMenu>
      ))}
    </div>
  )

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Documents</h1>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : all.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <IconFileText className="size-8" />
          <p className="text-sm">
            {search ? "No documents match your search." : "No documents yet — create one to start."}
          </p>
          {!search ? (
            <Button size="sm" disabled={creating} onClick={create}>
              <IconPlus className="size-4" />
              New document
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {owned.length > 0 ? grid(owned) : null}
          {shared.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-muted-foreground text-sm font-medium">Shared with me</h2>
              {grid(shared)}
            </div>
          ) : null}
        </div>
      )}

      <SelectionBar>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => ids.forEach((id) => byId.get(id) && downloadDoc(byId.get(id)!))}
        >
          <Icon name="download" className="size-4" />
          Download
        </Button>
        {single?.owner ? (
          <Button variant="ghost" size="sm" onClick={() => setRenaming(single)}>
            <IconPencil className="size-4" />
            Rename
          </Button>
        ) : null}
        <ConfirmButton
          icon={<Icon name="trash" className="size-4" />}
          armed={trashConfirm.armed}
          onTrigger={trashConfirm.trigger}
        >
          Trash
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

/** The Docs home: a selectable grid of the user's documents. */
const DocsList = () => (
  <SelectionProvider>
    <DocsListInner />
  </SelectionProvider>
)

export default DocsList
