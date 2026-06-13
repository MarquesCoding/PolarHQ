"use client"

import { useEffect, useState } from "react"
import type { DriveNode } from "@lib/drive"
import { lockFolder, removeFolderLock, unlockFolder } from "@lib/folderLock"
import { Button } from "@polarhq/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@polarhq/ui/components/dialog"
import { Input } from "@polarhq/ui/components/input"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

interface FolderLockDialogProps {
  node: DriveNode | null
  mode: "lock" | "remove"
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

const FolderLockDialog = ({ node, mode, open, onOpenChange, onDone }: FolderLockDialogProps) => {
  const { t } = useTranslation("drive")
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
      setError(t("folderLockDialog.passwordsDontMatch"))
      return
    }
    setBusy(true)
    setError(null)
    try {
      if (mode === "lock") {
        await lockFolder(node.id, password)
        toast.success(t("folderLockDialog.folderLocked"))
      } else {
        if (!(await unlockFolder(node.id, password))) {
          setError(t("folderLockDialog.incorrectPassword"))
          setBusy(false)
          return
        }
        await removeFolderLock(node.id)
        toast.success(t("folderLockDialog.lockRemoved"))
      }
      onDone()
      onOpenChange(false)
    } catch {
      setError(t("folderLockDialog.somethingWentWrong"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            {mode === "lock" ? t("folderLockDialog.lockFolderTitle") : t("folderLockDialog.removeLockTitle")}
          </DialogTitle>
          <DialogDescription>
            {mode === "lock"
              ? t("folderLockDialog.lockDescription")
              : t("folderLockDialog.removeDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Input
            autoFocus
            type="password"
            name="orbit-folder-password"
            autoComplete="off"
            placeholder={t("folderLockDialog.folderPasswordPlaceholder")}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && mode === "remove" && void submit()}
          />
          {mode === "lock" ? (
            <Input
              type="password"
              name="orbit-folder-password-confirm"
              autoComplete="off"
              placeholder={t("folderLockDialog.confirmPasswordPlaceholder")}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void submit()}
            />
          ) : null}
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("folderLockDialog.cancel")}
          </Button>
          <Button disabled={busy || !password} onClick={() => void submit()}>
            {mode === "lock" ? t("folderLockDialog.lock") : t("folderLockDialog.removeLock")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default FolderLockDialog
