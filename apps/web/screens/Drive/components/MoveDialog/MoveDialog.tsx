"use client"

import { useMemo, useState } from "react"
import { type DriveNode, fetchFolders, moveDriveNode } from "@workspace/core/drive"
import { Icon } from "@lib/icons"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

interface MoveDialogProps {
  nodeIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

const MoveDialog = ({ nodeIds, open, onOpenChange, onDone }: MoveDialogProps) => {
  const { t } = useTranslation("drive")
  const { data } = useQuery({ queryKey: ["drive", "folders"], queryFn: fetchFolders, enabled: open })
  const [dest, setDest] = useState<string | null>(null)
  const folders = data?.folders ?? []

  const byId = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders])
  const pathOf = (folder: DriveNode): string => {
    const parts: string[] = []
    let current: DriveNode | undefined = folder
    while (current) {
      parts.unshift(current.special === "root" ? t("moveDialog.myDrive") : current.name)
      current = current.parentId ? byId.get(current.parentId) : undefined
    }
    return parts.join(" / ")
  }

  const forbidden = useMemo(() => {
    const childMap = new Map<string, DriveNode[]>()
    for (const folder of folders) {
      const key = folder.parentId ?? ""
      childMap.set(key, [...(childMap.get(key) ?? []), folder])
    }
    const set = new Set(nodeIds)
    const stack = [...nodeIds]
    while (stack.length > 0) {
      const id = stack.pop()!
      for (const child of childMap.get(id) ?? []) {
        if (!set.has(child.id)) {
          set.add(child.id)
          stack.push(child.id)
        }
      }
    }
    return set
  }, [folders, nodeIds])

  const candidates = folders.filter((folder) => !forbidden.has(folder.id))

  const move = useMutation({
    mutationFn: () => Promise.all(nodeIds.map((id) => moveDriveNode(id, dest!))),
    onSuccess: () => {
      toast.success(t("moveDialog.moved"))
      setDest(null)
      onOpenChange(false)
      onDone()
    },
    onError: () => toast.error(t("moveDialog.moveFailed")),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("moveDialog.title")}</DialogTitle>
        </DialogHeader>
        <div className="scrollbar-slim flex max-h-72 flex-col gap-0.5 overflow-y-auto">
          {candidates.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setDest(folder.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                dest === folder.id ? "bg-sidebar-accent font-medium" : "hover:bg-sidebar-accent/60",
              )}
            >
              <Icon name="folder" className="text-primary size-4 shrink-0" />
              <span className="truncate">{pathOf(folder)}</span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("moveDialog.cancel")}
          </Button>
          <Button disabled={!dest || move.isPending} onClick={() => move.mutate()}>
            {t("moveDialog.move")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MoveDialog
