"use client"

import { useState } from "react"
import { createDriveFolder } from "@lib/drive"
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
  const [internalOpen, setInternalOpen] = useState(false)
  const [name, setName] = useState("")
  const controlled = onOpenChange !== undefined
  const open = controlled ? Boolean(openProp) : internalOpen
  const setOpen = controlled ? onOpenChange : setInternalOpen

  const create = useMutation({
    mutationFn: () => createDriveFolder(parentId, name.trim()),
    onSuccess: () => {
      toast.success("Folder created")
      setName("")
      setOpen(false)
      onDone()
    },
    onError: () => toast.error("Could not create folder"),
  })

  return (
    <>
      {!controlled ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Icon name="plus" className="size-4" />
          New folder
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Folder name"
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim()) create.mutate()
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default NewFolderDialog
