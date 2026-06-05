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
import { toast } from "sonner"

interface AddToAlbumDialogProps {
  assetIds: string[]
  onDone: () => void
}

const AddToAlbumDialog = ({ assetIds, onDone }: AddToAlbumDialogProps) => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
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
      toast.success("Added to album")
      finish()
    },
    onError: () => toast.error("Could not add to album"),
  })

  const create = useMutation({
    mutationFn: async () => {
      const album = await createAlbum(name.trim())
      await addToAlbum(album.id, assetIds)
    },
    onSuccess: () => {
      toast.success("Album created")
      setName("")
      finish()
    },
    onError: () => toast.error("Could not create album"),
  })

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Icon name="albums" className="size-4" />
        Album
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to album</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New album name"
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) create.mutate()
              }}
            />
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
              <IconPlus className="size-4" />
              Create
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
              <p className="text-muted-foreground p-2 text-sm">No albums yet. Create one above.</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AddToAlbumDialog
