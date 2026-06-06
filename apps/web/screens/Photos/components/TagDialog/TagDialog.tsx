"use client"

import { useState } from "react"
import { Icon } from "@lib/icons"
import { createTag, fetchTags, tagAssets } from "@lib/photos"
import { IconPlus, IconTag } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Kbd } from "@workspace/ui/components/kbd"
import { toast } from "sonner"

interface TagDialogProps {
  assetIds: string[]
  onDone: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const TagDialog = ({ assetIds, onDone, open: openProp, onOpenChange }: TagDialogProps) => {
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
      toast.success("Tagged")
      finish()
    },
    onError: () => toast.error("Could not tag"),
  })

  const create = useMutation({
    mutationFn: async () => {
      const tag = await createTag(name.trim())
      await tagAssets(tag.id, assetIds)
    },
    onSuccess: () => {
      toast.success("Tag created")
      setName("")
      finish()
    },
    onError: () => toast.error("Could not create tag"),
  })

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Icon name="tag" className="size-4" />
        Tag
        <Kbd>⇧T</Kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a tag</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New tag name"
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) create.mutate()
              }}
            />
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
              <IconPlus className="size-4" />
              Create
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
              <p className="text-muted-foreground p-2 text-sm">No tags yet. Create one above.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TagDialog
