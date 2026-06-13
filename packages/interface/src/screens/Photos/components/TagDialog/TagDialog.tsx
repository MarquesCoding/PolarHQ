"use client"

import { useState } from "react"
import { Icon } from "@polarhq/interface/lib/icons"
import { createTag, fetchTags, tagAssets } from "@polarhq/vault/photos"
import { IconPlus, IconTag } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@polarhq/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@polarhq/ui/components/dialog"
import { Input } from "@polarhq/ui/components/input"
import { Kbd } from "@polarhq/ui/components/kbd"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

interface TagDialogProps {
  assetIds: string[]
  onDone: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const TagDialog = ({ assetIds, onDone, open: openProp, onOpenChange }: TagDialogProps) => {
  const { t } = useTranslation("photos")
  const queryClient = useQueryClient()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [name, setName] = useState("")
  const { data: tags } = useQuery({ queryKey: ["photos", "tags"], queryFn: fetchTags, enabled: open })

  const finish = () => {
    void queryClient.invalidateQueries({ queryKey: ["photos"] })
    setOpen(false)
    onDone()
  }

  const apply = useMutation({
    mutationFn: (tagId: string) => tagAssets(tagId, assetIds),
    onSuccess: () => {
      toast.success(t("tagDialog.tagged"))
      finish()
    },
    onError: () => toast.error(t("tagDialog.couldNotTag")),
  })

  const create = useMutation({
    mutationFn: async () => {
      const tag = await createTag(name.trim())
      await tagAssets(tag.id, assetIds)
    },
    onSuccess: () => {
      toast.success(t("tagDialog.tagCreated"))
      setName("")
      finish()
    },
    onError: () => toast.error(t("tagDialog.couldNotCreateTag")),
  })

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Icon name="tag" className="size-4" />
        {t("tagDialog.tag")}
        <Kbd>⇧T</Kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tagDialog.addATag")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("tagDialog.newTagName")}
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) create.mutate()
              }}
            />
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
              <IconPlus className="size-4" />
              {t("tagDialog.create")}
            </Button>
          </div>
          <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto">
            {(tags ?? []).map((tag) => (
              <Button key={tag.id} variant="outline" size="sm" onClick={() => apply.mutate(tag.id)}>
                <IconTag className="size-3.5" />
                {tag.name}
              </Button>
            ))}
            {tags && tags.length === 0 ? (
              <p className="text-muted-foreground p-2 text-sm">{t("tagDialog.noTagsYet")}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TagDialog
