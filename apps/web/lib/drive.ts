import { apiFetch } from "@lib/apiClient"
import { API_URL } from "@lib/env"

export type DriveKind = "folder" | "file"

export interface DriveNode {
  id: string
  parentId: string | null
  kind: DriveKind
  name: string
  mimeType: string | null
  sizeBytes: number | null
  special: string | null
  photoAssetId: string | null
  trashedAt: string | null
  createdAt: string
  updatedAt: string
  downloadUrl: string | null
  thumbnailUrl: string | null
}

export interface DriveListing {
  parent: DriveNode
  breadcrumb: DriveNode[]
  children: DriveNode[]
}

export interface DriveUploadResult {
  node: DriveNode
  registeredInPhotos?: boolean
}

/** List a folder's contents. `parent` is a node id, or null/"root" for My Drive. */
export const fetchNodes = (parent?: string | null): Promise<DriveListing> =>
  apiFetch(`/api/v1/drive/nodes${parent ? `?parent=${encodeURIComponent(parent)}` : ""}`)

/**
 * Resolve a Drive browser path to its folder id: `undefined` for the root
 * (`/drive`), the id for `/drive/<id>`, or `null` for non-browser pages (trash).
 */
export const driveFolderIdFromPath = (pathname: string): string | undefined | null => {
  if (pathname === "/drive") return undefined
  const match = pathname.match(/^\/drive\/([^/]+)$/)
  if (!match || match[1] === "trash") return null
  return match[1]
}

export const createDriveFolder = (parentId: string | null, name: string): Promise<{ node: DriveNode }> =>
  apiFetch("/api/v1/drive/nodes/folder", {
    method: "POST",
    body: JSON.stringify({ parentId, name }),
  })

export const renameDriveNode = (id: string, name: string): Promise<{ ok: true }> =>
  apiFetch(`/api/v1/drive/nodes/${id}`, { method: "PATCH", body: JSON.stringify({ name }) })

export const moveDriveNode = (id: string, parentId: string): Promise<{ ok: true }> =>
  apiFetch(`/api/v1/drive/nodes/${id}`, { method: "PATCH", body: JSON.stringify({ parentId }) })

/** Move a node (and its descendants) to the trash. Syncs photo-linked nodes to Photos trash. */
export const trashDriveNode = (id: string): Promise<{ ok: true }> =>
  apiFetch(`/api/v1/drive/nodes/${id}/trash`, { method: "POST" })

export const restoreDriveNode = (id: string): Promise<{ ok: true }> =>
  apiFetch(`/api/v1/drive/nodes/${id}/restore`, { method: "POST" })

/** Permanently delete a node (and descendants) — used from the trash view. */
export const deleteDriveNode = (id: string): Promise<{ ok: true }> =>
  apiFetch(`/api/v1/drive/nodes/${id}`, { method: "DELETE" })

const ARCHIVE_EXTENSIONS = [".zip", ".tar", ".tar.gz", ".tgz", ".rar"]

/** Whether a node looks like an extractable archive (zip / tar / tar.gz / tgz / rar). */
export const isArchiveName = (name: string): boolean => {
  const lower = name.toLowerCase()
  return ARCHIVE_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/** Zip the given nodes into a new archive file in `parentId`. Pass `archiveId` to receive progress events. */
export const archiveDriveNodes = (
  nodeIds: string[],
  parentId: string,
  archiveId?: string,
): Promise<{ node: DriveNode }> =>
  apiFetch("/api/v1/drive/nodes/archive", {
    method: "POST",
    body: JSON.stringify({ nodeIds, parentId, archiveId }),
  })

/** Extract an archive node into a new folder beside it. */
export const extractDriveNode = (id: string): Promise<{ node: DriveNode }> =>
  apiFetch(`/api/v1/drive/nodes/${id}/extract`, { method: "POST" })

export const copyDriveNode = (id: string): Promise<{ node: DriveNode }> =>
  apiFetch(`/api/v1/drive/nodes/${id}/copy`, { method: "POST" })

export const fetchFolders = (): Promise<{ folders: DriveNode[] }> =>
  apiFetch("/api/v1/drive/folders")

export interface ShareLink {
  token: string
  url: string
  expiresAt: string | null
  maxDownloads: number | null
  downloadCount: number
}

export interface ShareOptions {
  expiresInHours?: number | null
  maxDownloads?: number | null
}

export const createShareLink = (id: string, options: ShareOptions = {}): Promise<ShareLink> =>
  apiFetch(`/api/v1/drive/nodes/${id}/share`, {
    method: "POST",
    body: JSON.stringify(options),
  })

export interface DriveVersion {
  id: string
  name: string
  sizeBytes: number | null
  mimeType: string | null
  createdAt: string
  downloadUrl: string
}

export const fetchVersions = (id: string): Promise<{ versions: DriveVersion[] }> =>
  apiFetch(`/api/v1/drive/nodes/${id}/versions`)

export const restoreDriveVersion = (id: string, versionId: string): Promise<{ node: DriveNode }> =>
  apiFetch(`/api/v1/drive/nodes/${id}/versions/${versionId}/restore`, { method: "POST" })

export const fetchDriveTrash = (): Promise<{ children: DriveNode[] }> =>
  apiFetch("/api/v1/drive/trash")

export const emptyDriveTrash = (): Promise<{ ok: true }> =>
  apiFetch("/api/v1/drive/trash/empty", { method: "POST" })

/** Upload a file into a folder via multipart. Media dropped in the Photos folder is registered with Photos. */
export const uploadDriveFile = async (
  parentId: string | null,
  file: File,
): Promise<DriveUploadResult> => {
  const form = new FormData()
  form.set("file", file)
  if (parentId) form.set("parentId", parentId)
  if (file.lastModified) form.set("mtime", String(file.lastModified))
  const response = await fetch(`${API_URL}/api/v1/drive/nodes/upload`, {
    method: "POST",
    credentials: "include",
    body: form,
  })
  if (!response.ok) throw new Error(`Upload failed (${response.status})`)
  return response.json() as Promise<DriveUploadResult>
}
