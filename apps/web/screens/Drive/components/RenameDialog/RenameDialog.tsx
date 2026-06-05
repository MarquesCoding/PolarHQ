"use client"

import { useEffect, useState } from "react"
import { type DriveNode, renameDriveNode } from "@lib/drive"
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

interface RenameDialogProps {
  node: DriveNode | null
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

const RenameDialog = ({ node, onOpenChange, onDone }: RenameDialogProps) => {
  const [name, setName] = useState("")

  useEffect(() => {
    if (node) setName(node.name)
  }, [node])

  const rename = useMutation({
    mutationFn: () => renameDriveNode(node!.id, name.trim()),
    onSuccess: () => {
      toast.success("Renamed")
      onOpenChange(false)
      onDone()
    },
    onError: () => toast.error("Could not rename"),
  })

  return (
    <Dialog open={Boolean(node)} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
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
            Cancel
          </Button>
          <Button disabled={!name.trim() || rename.isPending} onClick={() => rename.mutate()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RenameDialog
