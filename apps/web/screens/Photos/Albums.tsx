"use client"

import { useState } from "react"
import Link from "next/link"
import { createAlbum, fetchAlbums } from "@lib/photos"
import { IconPlus, IconStack2 } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { motion } from "motion/react"
import { toast } from "sonner"

const Albums = () => {
  const queryClient = useQueryClient()
  const { data: albums, isLoading } = useQuery({ queryKey: ["photos", "albums"], queryFn: fetchAlbums })
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  const create = useMutation({
    mutationFn: () => createAlbum(name.trim()),
    onSuccess: () => {
      toast.success("Album created")
      setName("")
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ["photos", "albums"] })
    },
    onError: () => toast.error("Could not create album"),
  })

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="flex items-center justify-end">
        <Button onClick={() => setOpen(true)}>
          <IconPlus className="size-4" />
          New album
        </Button>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">Loading albums…</p>
      ) : albums && albums.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {albums.map((album) => (
            <Link key={album.id} href={`/photos/albums/${album.id}`} className="group flex flex-col gap-2">
              <motion.div
                className="bg-muted aspect-square overflow-hidden rounded-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                {album.coverThumbnailUrl ? (
                  <img
                    src={album.coverThumbnailUrl}
                    alt={album.name}
                    className="h-full w-full object-cover transition group-hover:brightness-95"
                  />
                ) : (
                  <div className="text-muted-foreground flex h-full w-full items-center justify-center">
                    <IconStack2 className="size-6" />
                  </div>
                )}
              </motion.div>
              <div>
                <p className="truncate text-sm font-medium">{album.name}</p>
                <p className="text-muted-foreground text-xs">
                  {album.assetCount} item{album.assetCount === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No albums yet. Create one to organise your photos.
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New album</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Album name"
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) create.mutate()
              }}
            />
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Albums
