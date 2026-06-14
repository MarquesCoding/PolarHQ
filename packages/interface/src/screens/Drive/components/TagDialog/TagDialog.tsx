"use client"

import { useEffect, useState } from "react"
import { createDriveTag, fetchDriveTags, fetchNodeTags, saveNodeTags } from "@polarhq/vault/drive"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@polarhq/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@polarhq/ui/components/dialog"
import { Input } from "@polarhq/ui/components/input"
import { cn } from "@polarhq/ui/lib/utils"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

interface TagDialogProps {
  node: { id: string; name: string } | null
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

/** Attach or detach the owner's tags on a single node; new tags can be created inline. */
const TagDialog = ({ node, onOpenChange, onDone }: TagDialogProps) => {
  const { t } = useTranslation("drive")
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [draft, setDraft] = useState("")

  const { data: allTags = [] } = useQuery({ queryKey: ["drive", "tags"], queryFn: fetchDriveTags })
  const { data: nodeTags } = useQuery({
    queryKey: ["drive", "node-tags", node?.id],
    queryFn: () => fetchNodeTags(node!.id),
    enabled: Boolean(node),
  })

  useEffect(() => {
    if (nodeTags) setSelected(new Set(nodeTags.map((tag) => tag.id)))
  }, [nodeTags])

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const create = useMutation({
    mutationFn: () => createDriveTag(draft.trim()),
    onSuccess: (tag) => {
      setDraft("")
      setSelected((prev) => new Set(prev).add(tag.id))
      void queryClient.invalidateQueries({ queryKey: ["drive", "tags"] })
    },
    onError: () => toast.error(t("tagDialog.couldNotSave")),
  })

  const save = useMutation({
    mutationFn: () => saveNodeTags(node!.id, [...selected]),
    onSuccess: () => {
      toast.success(t("tagDialog.saved"))
      void queryClient.invalidateQueries({ queryKey: ["drive"] })
      onOpenChange(false)
      onDone()
    },
    onError: () => toast.error(t("tagDialog.couldNotSave")),
  })

  return (
    <Dialog open={Boolean(node)} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("tagDialog.title")}</DialogTitle>
        </DialogHeader>

        {allTags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => {
              const on = selected.has(tag.id)
              return (
                <Button
                  key={tag.id}
                  type="button"
                  variant={on ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggle(tag.id)}
                  className={cn("h-7 rounded-full px-3 text-xs", !on && "text-muted-foreground")}
                >
                  {tag.name}
                </Button>
              )
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("tagDialog.empty")}</p>
        )}

        <div className="flex items-center gap-2">
          <Input
            value={draft}
            placeholder={t("tagDialog.placeholder")}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && draft.trim()) create.mutate()
            }}
          />
          <Button
            variant="outline"
            disabled={!draft.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {t("tagDialog.add")}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("tagDialog.cancel")}
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {t("tagDialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default TagDialog
