import { useMemo } from "react"
import {
  type DriveNode,
  createShareLink,
  setNodeFavorite,
  trashDriveNode,
} from "@workspace/core/drive"
import { downloadDriveFile, fetchDecryptedFile, fetchDecryptedThumbnail } from "@workspace/core/driveE2e"
import { useUploadManager } from "@workspace/screens/uploadManager"
import type { ViewerController, ViewerItem } from "@pages/Photos/components/Lightbox/viewer"
import { useQueryClient } from "@tanstack/react-query"
import DriveInfoPanel from "@pages/Drive/components/DriveInfoPanel/DriveInfoPanel"

const toViewerItem = (node: DriveNode): ViewerItem => ({
  id: node.id,
  kind: "image",
  name: node.name,
  mimeType: node.mimeType ?? "",
  sizeBytes: node.sizeBytes ?? 0,
  encrypted: !!node.encrypted,
  previewUrl: node.encrypted ? null : (node.downloadUrl ?? node.thumbnailUrl ?? null),
  originalUrl: node.encrypted ? null : (node.downloadUrl ?? null),
  thumbnailUrl: node.encrypted ? null : (node.thumbnailUrl ?? null),
  videoUrl: null,
  motion: false,
  isFavorite: node.favorite ?? false,
})

/** A {@link ViewerController} over a list of Drive image nodes — wires the Photos Lightbox to Drive's
 *  E2E decryption, favourite/trash/share/download and a file-details panel. No editor or motion. */
export const useDriveViewer = (nodes: DriveNode[]): ViewerController => {
  const queryClient = useQueryClient()
  const upload = useUploadManager()
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const items = useMemo(() => nodes.map(toViewerItem), [nodes])

  return useMemo<ViewerController>(() => {
    const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["drive"] })
    return {
      items,
      fetchOriginal: (item) => {
        const node = byId.get(item.id)
        return node ? fetchDecryptedFile(node.id, node.downloadUrl ?? "", node.mimeType) : Promise.resolve(null)
      },
      fetchThumbnail: (item) =>
        item.encrypted ? fetchDecryptedThumbnail(item.id) : Promise.resolve(item.thumbnailUrl ?? null),
      toggleFavorite: async (item) => {
        const node = byId.get(item.id)
        if (!node) return
        await setNodeFavorite(node.id, !node.favorite).catch(() => undefined)
        invalidate()
      },
      trash: async (item) => {
        await trashDriveNode(item.id).catch(() => undefined)
        invalidate()
      },
      download: (item) => {
        const node = byId.get(item.id)
        if (!node) return
        upload.downloadFile(node.name, node.sizeBytes ?? 0, (onProgress) =>
          downloadDriveFile(node, (progress) => onProgress(progress.loaded, progress.speed)),
        )
      },
      share: (item) => ({
        createLink: (options) => createShareLink(item.id, options),
        encryptKeyId: item.encrypted ? item.id : undefined,
      }),
      renderInfo: (item, { onFavorite, onShare }) => {
        const node = byId.get(item.id)
        return node ? <DriveInfoPanel node={node} onFavorite={onFavorite} onShare={onShare} /> : null
      },
    }
  }, [items, byId, upload, queryClient])
}
