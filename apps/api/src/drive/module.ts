import { type PermissionDef, registerPermissions } from "@workspace/auth"

export const DRIVE_APP_ID = "drive"

export const DRIVE_PERMISSIONS: PermissionDef[] = [
  { key: "drive.file.read", description: "View files", resource: "file", action: "read" },
  { key: "drive.file.create", description: "Upload files", resource: "file", action: "create" },
  { key: "drive.file.update", description: "Rename and move files", resource: "file", action: "update" },
  { key: "drive.file.delete", description: "Delete files", resource: "file", action: "delete" },
]

/** Register the Drive module's permissions (storage limits are shared with Photos). */
export const registerDriveModule = (): void => {
  registerPermissions(DRIVE_PERMISSIONS)
}
