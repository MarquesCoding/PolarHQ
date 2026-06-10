"use client"

import { useState } from "react"
import { Icon } from "@lib/icons"
import { addToAlbum, createAlbum, fetchAlbums } from "@lib/photos"
import { IconPlus } from "@tabler/icons-react"
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
import { useTranslation } from "react-i18next"

interface AddToAlbumDialogProps {
  assetIds: string[]
  onDone: () => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

const AddToAlbumDialog = ({
  assetIds,
  onDone,
  open: openProp,
  onOpenChange,
}: AddToAlbumDialogProps) => {
  const { t } = useTranslation("photos")
  const queryClient = useQueryClient()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [name, setName] = useState("")
  const { data: albums } = useQuery({
    queryKey: ["photos", "albums"],
    queryFn: fetchAlbums,
    enabled: open,
  })

  const finish = () => {
    void queryClient.invalidateQueries({ queryKey: ["photos"] })
    setOpen(false)
    onDone()
  }

  const add = useMutation({
    mutationFn: (albumId: string) => addToAlbum(albumId, assetIds),
    onSuccess: () => {
      toast.success(t("addToAlbumDialog.addedToast"))
      finish()
    },
    onError: () => toast.error(t("addToAlbumDialog.addErrorToast")),
  })

  const create = useMutation({
    mutationFn: async () => {
      const album = await createAlbum(name.trim())
      await addToAlbum(album.id, assetIds)
    },
    onSuccess: () => {
      toast.success(t("addToAlbumDialog.createdToast"))
      setName("")
      finish()
    },
    onError: () => toast.error(t("addToAlbumDialog.createErrorToast")),
  })

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Icon name="albums" className="size-4" />
        {t("addToAlbumDialog.albumButton")}
        <Kbd>⇧L</Kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addToAlbumDialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("addToAlbumDialog.namePlaceholder")}
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) create.mutate()
              }}
            />
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
              <IconPlus className="size-4" />
              {t("addToAlbumDialog.create")}
            </Button>
          </div>
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {(albums ?? []).map((album) => (
              <Button
                key={album.id}
                variant="ghost"
                className="justify-between"
                onClick={() => add.mutate(album.id)}
              >
                <span className="truncate">{album.name}</span>
                <span className="text-muted-foreground text-xs">{album.assetCount}</span>
              </Button>
            ))}
            {albums && albums.length === 0 ? (
              <p className="text-muted-foreground p-2 text-sm">{t("addToAlbumDialog.empty")}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AddToAlbumDialog
