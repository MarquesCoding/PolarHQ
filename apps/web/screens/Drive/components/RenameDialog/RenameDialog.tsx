"use client"

import { useEffect, useState } from "react"
import { renameDriveNode } from "@workspace/core/drive"
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
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

interface RenameDialogProps {
  node: { id: string; name: string } | null
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

const RenameDialog = ({ node, onOpenChange, onDone }: RenameDialogProps) => {
  const { t } = useTranslation("drive")
  const [name, setName] = useState("")

  useEffect(() => {
    if (node) setName(node.name)
  }, [node])

  const rename = useMutation({
    mutationFn: () => renameDriveNode(node!.id, name.trim()),
    onSuccess: () => {
      toast.success(t("renameDialog.renamed"))
      onOpenChange(false)
      onDone()
    },
    onError: () => toast.error(t("renameDialog.couldNotRename")),
  })

  return (
    <Dialog open={Boolean(node)} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("renameDialog.title")}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && name.trim()) rename.mutate()
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("renameDialog.cancel")}
          </Button>
          <Button disabled={!name.trim() || rename.isPending} onClick={() => rename.mutate()}>
            {t("renameDialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RenameDialog
