"use client"

import { useMemo } from "react"
import { decryptName } from "@lib/e2e"
import {
  type GridAsset,
  assetOriginalUrl,
  favoriteAssets,
  sharePhoto,
  stackAssets,
  trashAssets,
  uploadAsset,
} from "@lib/photos"
import {
  fetchDecryptedMotionVideo,
  fetchDecryptedPhotoOriginal,
  fetchDecryptedPhotoThumbnail,
  uploadEncryptedMedia,
} from "@lib/photosE2e"
import { useUploadManager } from "@lib/uploadManager"
import { decryptedThumbnails } from "@pages/Photos/components/PhotoTile/PhotoTile"
import InfoPanel from "@pages/Photos/components/InfoPanel/InfoPanel"
import { useQueryClient } from "@tanstack/react-query"
import type { ViewerController, ViewerItem } from "./viewer"

const toViewerItem = (asset: GridAsset): ViewerItem => ({
  id: asset.id,
  kind: asset.type,
  name: (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename,
  mimeType: asset.mimeType,
  sizeBytes: asset.sizeBytes,
  encrypted: asset.encrypted,
  previewUrl: asset.encrypted ? null : (asset.previewUrl ?? asset.thumbnailUrl ?? null),
  originalUrl: asset.encrypted ? null : assetOriginalUrl(asset.id),
  thumbnailUrl: asset.encrypted ? null : (asset.thumbnailUrl ?? null),
  videoUrl: asset.encrypted ? null : (asset.videoUrl ?? null),
  motion: asset.motion,
  isFavorite: asset.isFavorite,
})

/** A {@link ViewerController} over a list of Photos {@link GridAsset}s — wires the Lightbox to the
 *  photos E2E decryption, favourite/trash/share/download, the EXIF InfoPanel and the photo editor
 *  (which saves an edit as a new asset stacked over the original). */
export const usePhotosViewer = (assets: GridAsset[]): ViewerController => {
  const queryClient = useQueryClient()
  const upload = useUploadManager()
  const items = useMemo(() => assets.map(toViewerItem), [assets])

  return useMemo<ViewerController>(() => {
    const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["photos"] })
    return {
      items,
      fetchOriginal: (item) => fetchDecryptedPhotoOriginal(item.id, item.mimeType),
      fetchThumbnail: async (item) => {
        if (!item.encrypted) return item.thumbnailUrl ?? null
        const cached = decryptedThumbnails.get(item.id)
        if (cached) return cached
        const result = await fetchDecryptedPhotoThumbnail(item.id)
        if (result) decryptedThumbnails.set(item.id, result)
        return result
      },
      fetchMotion: (item) => fetchDecryptedMotionVideo(item.id),
      toggleFavorite: async (item) => {
        await favoriteAssets([item.id], !item.isFavorite).catch(() => undefined)
        invalidate()
      },
      trash: async (item) => {
        await trashAssets([item.id]).catch(() => undefined)
        invalidate()
      },
      download: (item) =>
        upload.download(item.name, [
          { id: item.id, name: item.name, encrypted: item.encrypted, size: item.sizeBytes },
        ]),
      share: (item) => ({
        createLink: (options) => sharePhoto(item.id, options),
        encryptKeyId: item.encrypted ? item.id : undefined,
      }),
      renderInfo: (item, { onFavorite, onShare }) => (
        <InfoPanel
          assetId={item.id}
          isFavorite={item.isFavorite}
          onFavorite={onFavorite}
          onShare={onShare}
        />
      ),
      editing: {
        save: async (item, file) => {
          const edited = item.encrypted
            ? await uploadEncryptedMedia(file)
            : (await uploadAsset(file)).asset
          await stackAssets([edited.id, item.id]).catch(() => undefined)
          invalidate()
        },
      },
    }
  }, [items, upload, queryClient])
}
