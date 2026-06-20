import { useState } from "react"
import { createDriveFolder } from "@workspace/core/drive"
import { Icon } from "@lib/icons"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

interface NewFolderDialogProps {
  parentId: string
  onDone: () => void
  /** Controlled open state. When provided, the built-in trigger button is hidden. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const NewFolderDialog = ({
  parentId,
  onDone,
  open: openProp,
  onOpenChange,
}: NewFolderDialogProps) => {
  const { t } = useTranslation("drive")
  const [internalOpen, setInternalOpen] = useState(false)
  const [name, setName] = useState("")
  const controlled = onOpenChange !== undefined
  const open = controlled ? Boolean(openProp) : internalOpen
  const setOpen = controlled ? onOpenChange : setInternalOpen

  const create = useMutation({
    mutationFn: () => createDriveFolder(parentId, name.trim()),
    onSuccess: () => {
      toast.success(t("newFolderDialog.created"))
      setName("")
      setOpen(false)
      onDone()
    },
    onError: () => toast.error(t("newFolderDialog.createError")),
  })

  return (
    <>
      {!controlled ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Icon name="plus" className="size-4" />
          {t("newFolderDialog.newFolder")}
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("newFolderDialog.title")}</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("newFolderDialog.placeholder")}
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim()) create.mutate()
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("newFolderDialog.cancel")}
            </Button>
            <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
              {t("newFolderDialog.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default NewFolderDialog
