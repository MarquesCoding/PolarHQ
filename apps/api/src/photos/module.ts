import { type PermissionDef, registerLimit, registerPermissions } from "@polarhq/auth"

export const PHOTOS_APP_ID = "photos"

export const PHOTOS_PERMISSIONS: PermissionDef[] = [
  { key: "photos.asset.read", description: "View photos", resource: "asset", action: "read" },
  { key: "photos.asset.create", description: "Upload photos", resource: "asset", action: "create" },
  { key: "photos.asset.update", description: "Edit photos", resource: "asset", action: "update" },
  { key: "photos.asset.delete", description: "Delete photos", resource: "asset", action: "delete" },
  { key: "photos.album.create", description: "Create albums", resource: "album", action: "create" },
  { key: "photos.album.share", description: "Share albums", resource: "album", action: "share" },
]

/** Register the Photos module's permissions and limits into the shared registries. */
export const registerPhotosModule = (): void => {
  registerPermissions(PHOTOS_PERMISSIONS)
  registerLimit({
    key: "storage.quota.bytes",
    type: "bytes",
    strategy: "max",
    systemDefault: null,
  })
  registerLimit({
    key: "photos.upload.maxFileBytes",
    type: "bytes",
    strategy: "override",
    systemDefault: 1_000_000_000,
  })
}
