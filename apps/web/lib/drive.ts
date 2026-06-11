import { apiFetch } from "@lib/apiClient"
import { decryptName, encryptName, encryptedPlaceholder } from "@lib/e2e"
import { API_URL } from "@lib/env"

export type DriveKind = "folder" | "file"

export interface DriveNode {
  id: string
  parentId: string | null
  kind: DriveKind
  name: string
  /** The name encrypted with the owner's account metadata key (E2E); `name` is a placeholder. */
  encryptedName?: string | null
  /** For shared docs: the name encrypted with the content key, readable by collaborators. */
  sharedName?: string | null
  mimeType: string | null
  sizeBytes: number | null
  special: string | null
  photoAssetId: string | null
  encrypted?: boolean
  locked?: boolean
  trashedAt: string | null
  createdAt: string
  updatedAt: string
  downloadUrl: string | null
  thumbnailUrl: string | null
}

/** Replace a node's placeholder name with its decrypted name, when we hold the metadata key. */
export const decryptNodeName = <T extends Pick<DriveNode, "name" | "encryptedName">>(
  node: T,
): T => {
  const name = decryptName(node.encryptedName)
  return name ? { ...node, name } : node
}

/** Build the request fields for a node name — encrypted when keys are available, else plaintext. */
const nameFields = (
  name: string,
  sharedName?: string | null,
): { name: string; encryptedName?: string; sharedName?: string | null } => {
  const encryptedName = encryptName(name)
  if (!encryptedName) return { name }
  return sharedName === undefined
    ? { name: encryptedPlaceholder(), encryptedName }
    : { name: encryptedPlaceholder(), encryptedName, sharedName }
}

export type StorageApp = "photos" | "drive" | "docs" | "sheets" | "whiteboard"

export type StorageKind = "image" | "video" | "audio" | "document" | "archive" | "other"

export interface StorageStats {
  usedBytes: number
  quotaBytes: number | null
  breakdown: { app: StorageApp; bytes: number; count: number }[]
  kinds: { kind: StorageKind; bytes: number; count: number }[]
  largest: {
    id: string
    name: string
    encryptedName: string | null
    mimeType: string | null
    sizeBytes: number
    app: StorageApp
  }[]
}

export const fetchStorageStats = (): Promise<StorageStats> =>
  apiFetch<StorageStats>("/api/v1/drive/storage")

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
export type LibraryView = "recent" | "kind"

/** A parentless, cross-folder file listing for the sidebar smart views (Recents / a file kind). */
export type LibrarySource = { view: "recent" } | { view: "kind"; kind: StorageKind }

/** Fetch a flat smart-view listing (most-recent files, or all files of one kind). */
export const fetchLibrary = async (source: LibrarySource): Promise<{ children: DriveNode[] }> => {
  const params = new URLSearchParams({ view: source.view })
  if (source.view === "kind") params.set("kind", source.kind)
  const listing = await apiFetch<{ children: DriveNode[] }>(`/api/v1/drive/library?${params}`)
  return { children: listing.children.map(decryptNodeName) }
}

export const fetchNodes = async (parent?: string | null): Promise<DriveListing> => {
  const listing = await apiFetch<DriveListing>(
    `/api/v1/drive/nodes${parent ? `?parent=${encodeURIComponent(parent)}` : ""}`,
  )
  return {
    parent: decryptNodeName(listing.parent),
    breadcrumb: listing.breadcrumb.map(decryptNodeName),
    children: listing.children.map(decryptNodeName),
  }
}

/**
 * Resolve a Drive browser path to its folder id: `undefined` for the root
 * (`/drive`), the id for `/drive/<id>`, or `null` for non-browser pages (trash).
 */
export const driveFolderIdFromPath = (pathname: string): string | undefined | null => {
  if (pathname === "/drive/files") return undefined
  if (pathname.startsWith("/drive/kind/")) return null
  const match = pathname.match(/^\/drive\/([^/]+)$/)
  const reserved = ["trash", "overview", "files", "recent", "kind"]
  if (!match || reserved.includes(match[1]!)) return null
  return match[1]
}

export const createDriveFolder = (
  parentId: string | null,
  name: string,
): Promise<{ node: DriveNode }> =>
  apiFetch<{ node: DriveNode }>("/api/v1/drive/nodes/folder", {
    method: "POST",
    body: JSON.stringify({ parentId, ...nameFields(name) }),
  }).then((r) => ({ node: decryptNodeName(r.node) }))

/** Rename a node. For shared docs, pass `sharedName` (content-key-encrypted) for collaborators. */
export const renameDriveNode = (
  id: string,
  name: string,
  sharedName?: string | null,
): Promise<{ ok: true }> =>
  apiFetch(`/api/v1/drive/nodes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(nameFields(name, sharedName)),
  })

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

export const fetchFolderLock = (id: string): Promise<{ salt: string; verifier: string }> =>
  apiFetch(`/api/v1/drive/nodes/${id}/lock`)

export const setFolderLockApi = (id: string, salt: string, verifier: string): Promise<{ ok: true }> =>
  apiFetch(`/api/v1/drive/nodes/${id}/lock`, {
    method: "POST",
    body: JSON.stringify({ salt, verifier }),
  })

export const removeFolderLockApi = (id: string): Promise<{ ok: true }> =>
  apiFetch(`/api/v1/drive/nodes/${id}/lock`, { method: "DELETE" })

export const fetchFolders = (): Promise<{ folders: DriveNode[] }> =>
  apiFetch<{ folders: DriveNode[] }>("/api/v1/drive/folders").then((r) => ({
    folders: r.folders.map(decryptNodeName),
  }))

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
  apiFetch<{ children: DriveNode[] }>("/api/v1/drive/trash").then((r) => ({
    children: r.children.map(decryptNodeName),
  }))

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
