import { apiFetch } from "./apiClient"
import { coreConfig } from "./config"
import {
  CHUNKED_UPLOAD_THRESHOLD,
  uploadEncryptedDriveFile,
  uploadEncryptedDriveFileChunked,
} from "./driveE2e"
import { uploadEncryptedMedia, uploadEncryptedMediaChunked } from "./photosE2e"

/**
 * Client side of "Migrate from Google". The server brokers OAuth and proxies the download; here we
 * fetch each item's bytes through that proxy and re-upload them with the **same E2E path as a normal
 * upload** — so imported content is encrypted client-side and the server only ever stores ciphertext.
 */

export interface GoogleStatus {
  connected: boolean
  email: string | null
  /** Whether the server has a Google OAuth client configured at all. */
  configured: boolean
}

export const googleStatus = (): Promise<GoogleStatus> => apiFetch("/api/v1/migrate/google/status")

/** Get the consent URL to open so the user can link their Google account. */
export const googleConnectUrl = (): Promise<{ url: string }> =>
  apiFetch("/api/v1/migrate/google/connect")

export const googleDisconnect = (): Promise<{ ok: boolean }> =>
  apiFetch("/api/v1/migrate/google", { method: "DELETE" })

export interface GooglePhotoItem {
  id: string
  filename: string
  mimeType: string
  baseUrl: string
  createdAt: string | null
}

export interface GoogleDriveFile {
  id: string
  name: string
  mimeType: string
  size: number | null
  modifiedAt: string | null
  parents: string[]
}

const listPhotosPage = (
  pageToken?: string,
): Promise<{ items: GooglePhotoItem[]; nextPageToken?: string }> =>
  apiFetch(
    `/api/v1/migrate/google/photos${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ""}`,
  )

const listDrivePage = (
  pageToken?: string,
): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> =>
  apiFetch(
    `/api/v1/migrate/google/drive${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ""}`,
  )

/** Stream an item's original bytes back from Google via the server proxy. */
const downloadProxy = async (query: string): Promise<Blob> => {
  const response = await fetch(`${coreConfig().apiUrl}/api/v1/migrate/google/download?${query}`, {
    credentials: "include",
  })
  if (!response.ok) throw new Error("migrate.downloadFailed")
  return response.blob()
}

export interface MigrateProgress {
  total: number
  done: number
  failed: number
  /** Name of the item currently importing, or null when finished. */
  current: string | null
}

/** Import the whole Google Photos library into PolarHQ Photos, E2E-encrypted. Best-effort per item. */
export const importGooglePhotos = async (
  onProgress: (progress: MigrateProgress) => void,
  signal?: AbortSignal,
): Promise<void> => {
  const items: GooglePhotoItem[] = []
  let pageToken: string | undefined
  do {
    if (signal?.aborted) return
    const page = await listPhotosPage(pageToken)
    items.push(...page.items)
    pageToken = page.nextPageToken
  } while (pageToken)

  let done = 0
  let failed = 0
  for (const item of items) {
    if (signal?.aborted) return
    onProgress({ total: items.length, done, failed, current: item.filename })
    try {
      const isVideo = item.mimeType.startsWith("video/")
      const blob = await downloadProxy(
        `source=photos&baseUrl=${encodeURIComponent(item.baseUrl)}${isVideo ? "&video=1" : ""}`,
      )
      const file = new File([blob], item.filename, { type: item.mimeType })
      if (file.size > CHUNKED_UPLOAD_THRESHOLD) await uploadEncryptedMediaChunked(file)
      else await uploadEncryptedMedia(file)
    } catch {
      failed += 1
    }
    done += 1
  }
  onProgress({ total: items.length, done, failed, current: null })
}

/**
 * Import Google Drive files into PolarHQ Drive (flat in the root for now), E2E-encrypted. Google-native
 * formats (Docs/Sheets/Slides) are skipped — they need export conversion, handled later.
 */
export const importGoogleDrive = async (
  onProgress: (progress: MigrateProgress) => void,
  signal?: AbortSignal,
): Promise<void> => {
  const files: GoogleDriveFile[] = []
  let pageToken: string | undefined
  do {
    if (signal?.aborted) return
    const page = await listDrivePage(pageToken)
    files.push(
      ...page.files.filter(
        (f) => !f.mimeType.startsWith("application/vnd.google-apps") && f.mimeType !== "",
      ),
    )
    pageToken = page.nextPageToken
  } while (pageToken)

  let done = 0
  let failed = 0
  for (const file of files) {
    if (signal?.aborted) return
    onProgress({ total: files.length, done, failed, current: file.name })
    try {
      const blob = await downloadProxy(`source=drive&fileId=${encodeURIComponent(file.id)}`)
      const upload = new File([blob], file.name, {
        type: file.mimeType || "application/octet-stream",
      })
      if (upload.size > CHUNKED_UPLOAD_THRESHOLD) await uploadEncryptedDriveFileChunked(null, upload)
      else await uploadEncryptedDriveFile(null, upload)
    } catch {
      failed += 1
    }
    done += 1
  }
  onProgress({ total: files.length, done, failed, current: null })
}
