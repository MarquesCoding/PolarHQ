"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { type Album, createAlbum, fetchAlbums } from "@lib/photos"
import { fetchDecryptedPhotoThumbnail } from "@lib/photosE2e"
import EmptyState from "@components/EmptyState/EmptyState"
import { TopBarActions } from "@components/FlatShell"
import { decryptedThumbnails } from "@pages/Photos/components/PhotoTile/PhotoTile"
import { IconPlus, IconStack2 } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@polarhq/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@polarhq/ui/components/dialog"
import { Input } from "@polarhq/ui/components/input"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

/** Album cover thumbnail — decrypts the cover client-side for E2E albums (it's ciphertext at rest). */
const AlbumCover = ({ album }: { album: Album }) => {
  const [src, setSrc] = useState<string | null>(() =>
    album.coverEncrypted
      ? (album.coverAssetId ? (decryptedThumbnails.get(album.coverAssetId) ?? null) : null)
      : album.coverThumbnailUrl,
  )
  useEffect(() => {
    if (!album.coverEncrypted) {
      setSrc(album.coverThumbnailUrl)
      return
    }
    if (!album.coverAssetId) return
    const cached = decryptedThumbnails.get(album.coverAssetId)
    if (cached) {
      setSrc(cached)
      return
    }
    let on = true
    void fetchDecryptedPhotoThumbnail(album.coverAssetId).then((result) => {
      if (!result) return
      decryptedThumbnails.set(album.coverAssetId as string, result)
      if (on) setSrc(result)
    })
    return () => {
      on = false
    }
  }, [album.coverAssetId, album.coverEncrypted, album.coverThumbnailUrl])

  if (!src) {
    return (
      <div className="text-muted-foreground flex h-full w-full items-center justify-center">
        <IconStack2 className="size-6" />
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={album.name}
      className="h-full w-full object-cover transition group-hover:brightness-95"
    />
  )
}

const Albums = () => {
  const { t } = useTranslation("photos")
  const queryClient = useQueryClient()
  const { data: albums, isLoading } = useQuery({ queryKey: ["photos", "albums"], queryFn: fetchAlbums })
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  const create = useMutation({
    mutationFn: () => createAlbum(name.trim()),
    onSuccess: () => {
      toast.success(t("albums.created"))
      setName("")
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ["photos", "albums"] })
    },
    onError: () => toast.error(t("albums.createFailed")),
  })

  return (
    <div className="flex flex-1 flex-col p-6">
      <TopBarActions>
        <Button size="sm" onClick={() => setOpen(true)}>
          <IconPlus className="size-4" />
          {t("albums.newAlbum")}
        </Button>
      </TopBarActions>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t("albums.loading")}</p>
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
                <AlbumCover album={album} />
              </motion.div>
              <div>
                <p className="truncate text-sm font-medium">{album.name}</p>
                <p className="text-muted-foreground text-xs">
                  {t("albums.itemCount", { count: album.assetCount })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="albums"
          title={t("albums.emptyTitle")}
          hint={t("albums.emptyHint")}
        >
          <Button size="sm" onClick={() => setOpen(true)}>
            <IconPlus className="size-4" />
            {t("albums.newAlbum")}
          </Button>
        </EmptyState>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("albums.newAlbum")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("albums.namePlaceholder")}
              onKeyDown={(event) => {
                if (event.key === "Enter" && name.trim()) create.mutate()
              }}
            />
            <Button onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
              {t("albums.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Albums
