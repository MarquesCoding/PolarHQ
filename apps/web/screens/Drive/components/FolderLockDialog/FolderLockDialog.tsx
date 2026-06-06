"use client"

import { useEffect, useState } from "react"
import type { DriveNode } from "@lib/drive"
import { lockFolder, removeFolderLock, unlockFolder } from "@lib/folderLock"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { toast } from "sonner"

interface FolderLockDialogProps {
  node: DriveNode | null
  mode: "lock" | "remove"
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

const FolderLockDialog = ({ node, mode, open, onOpenChange, onDone }: FolderLockDialogProps) => {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setPassword("")
      setConfirm("")
      setError(null)
    }
  }, [open])

  const submit = async () => {
    if (!node || !password) return
    if (mode === "lock" && password !== confirm) {
      setError("Passwords don’t match.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (mode === "lock") {
        await lockFolder(node.id, password)
        toast.success("Folder locked")
      } else {
        if (!(await unlockFolder(node.id, password))) {
          setError("Incorrect password.")
          setBusy(false)
          return
        }
        await removeFolderLock(node.id)
        toast.success("Lock removed")
      }
      onDone()
      onOpenChange(false)
    } catch {
      setError("Something went wrong.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{mode === "lock" ? "Lock folder" : "Remove lock"}</DialogTitle>
          <DialogDescription>
            {mode === "lock"
              ? "Set a password to open this folder. It gates access on this device — your files stay end-to-end encrypted regardless."
              : "Enter the folder password to remove its lock."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Input
            autoFocus
            type="password"
            name="orbit-folder-password"
            autoComplete="off"
            placeholder="Folder password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && mode === "remove" && void submit()}
          />
          {mode === "lock" ? (
            <Input
              type="password"
              name="orbit-folder-password-confirm"
              autoComplete="off"
              placeholder="Confirm password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void submit()}
            />
          ) : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={busy || !password} onClick={() => void submit()}>
            {mode === "lock" ? "Lock" : "Remove lock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default FolderLockDialog
