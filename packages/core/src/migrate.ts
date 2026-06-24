import { apiFetch } from "./apiClient"
import { coreConfig } from "./config"
import { createDriveFolder } from "./drive"
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

/**
 * Get the consent URL to open so the user can link their Google account. Pass `client:"desktop"` so
 * the server's callback shows a "return to the app" page instead of redirecting into the web app
 * (the desktop shell opens this URL in the system browser and polls {@link waitForGoogleConnected}).
 */
export const googleConnectUrl = (client?: "desktop"): Promise<{ url: string }> =>
  apiFetch(`/api/v1/migrate/google/connect${client ? `?client=${client}` : ""}`)

export const googleDisconnect = (): Promise<{ ok: boolean }> =>
  apiFetch("/api/v1/migrate/google", { method: "DELETE" })

/**
 * Poll the connection status until the account links (desktop OAuth finishes in the external browser),
 * the signal aborts, or the deadline passes. Resolves true once connected, false otherwise.
 */
export const waitForGoogleConnected = async (
  signal?: AbortSignal,
  { intervalMs = 2500, timeoutMs = 5 * 60 * 1000 }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<boolean> => {
  const started = performance.now()
  while (performance.now() - started < timeoutMs) {
    if (signal?.aborted) return false
    try {
      if ((await googleStatus()).connected) return true
    } catch {
      // transient — keep polling
    }
    try {
      await sleep(intervalMs, signal)
    } catch {
      return false // aborted during the wait
    }
  }
  return false
}

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

export interface PickerSession {
  id: string
  pickerUri: string
  mediaItemsSet: boolean
  pollIntervalMs: number
}

const createPickerSession = (): Promise<PickerSession> =>
  apiFetch("/api/v1/migrate/google/picker/session", { method: "POST" })

const pollPickerSession = (id: string): Promise<PickerSession> =>
  apiFetch(`/api/v1/migrate/google/picker/session/${id}`)

const closePickerSession = (id: string): Promise<{ ok: boolean }> =>
  apiFetch(`/api/v1/migrate/google/picker/session/${id}`, { method: "DELETE" })

const listPickedPage = (
  sessionId: string,
  pageToken?: string,
): Promise<{ items: GooglePhotoItem[]; nextPageToken?: string }> =>
  apiFetch(
    `/api/v1/migrate/google/picker/items?sessionId=${encodeURIComponent(sessionId)}${
      pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
    }`,
  )

const listDrivePage = (
  pageToken?: string,
): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> =>
  apiFetch(
    `/api/v1/migrate/google/drive${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ""}`,
  )

type ImportSource = "photos" | "drive"

/** The ledger of items already imported for a source (resumability). `polarId` is set for folders. */
const fetchImported = (
  source: ImportSource,
): Promise<{ items: Array<{ googleId: string; polarId: string | null }> }> =>
  apiFetch(`/api/v1/migrate/imported?source=${source}`)

/** Record an item as imported. Best-effort — failures just mean it may re-import on the next run. */
const markImported = (
  source: ImportSource,
  googleId: string,
  polarId?: string | null,
): Promise<unknown> =>
  apiFetch("/api/v1/migrate/imported", {
    method: "POST",
    body: JSON.stringify({ source, googleId, polarId: polarId ?? null }),
  }).catch(() => undefined)

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

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true },
    )
  })

export interface PhotoImportHandlers {
  /** The user must open this URL (in Google Photos) and choose what to import. */
  onPickerUrl: (url: string) => void
  /** Called once the user has finished selecting and the actual import begins. */
  onPicked?: () => void
  onProgress: (progress: MigrateProgress) => void
}

/**
 * Import Google Photos into PolarHQ Photos via the **Picker API**, E2E-encrypted. Google no longer
 * allows whole-library reads, so the user opens `pickerUri`, chooses media, and we import their
 * selection. Best-effort per item; resolves when the import finishes (or rejects on abort).
 */
export const importGooglePhotos = async (
  handlers: PhotoImportHandlers,
  signal?: AbortSignal,
): Promise<void> => {
  const { onPickerUrl, onPicked, onProgress } = handlers
  const session = await createPickerSession()
  onPickerUrl(session.pickerUri)
  onProgress({ total: 0, done: 0, failed: 0, current: null })

  // Wait for the user to finish picking in Google Photos.
  let picked = session.mediaItemsSet
  while (!picked) {
    if (signal?.aborted) {
      await closePickerSession(session.id).catch(() => undefined)
      return
    }
    await sleep(session.pollIntervalMs, signal)
    picked = (await pollPickerSession(session.id)).mediaItemsSet
  }
  onPicked?.()

  const items: GooglePhotoItem[] = []
  let pageToken: string | undefined
  do {
    if (signal?.aborted) break
    const page = await listPickedPage(session.id, pageToken)
    items.push(...page.items)
    pageToken = page.nextPageToken
  } while (pageToken)

  // Skip anything already imported in a previous run (resumability).
  const imported = new Set((await fetchImported("photos")).items.map((i) => i.googleId))
  const pending = items.filter((item) => !imported.has(item.id))

  let done = 0
  let failed = 0
  for (const item of pending) {
    if (signal?.aborted) break
    onProgress({ total: pending.length, done, failed, current: item.filename })
    try {
      const isVideo = item.mimeType.startsWith("video/")
      const blob = await downloadProxy(
        `source=photos&baseUrl=${encodeURIComponent(item.baseUrl)}${isVideo ? "&video=1" : ""}`,
      )
      const file = new File([blob], item.filename, { type: item.mimeType })
      if (file.size > CHUNKED_UPLOAD_THRESHOLD) await uploadEncryptedMediaChunked(file)
      else await uploadEncryptedMedia(file)
      await markImported("photos", item.id)
    } catch {
      failed += 1
    }
    done += 1
  }
  await closePickerSession(session.id).catch(() => undefined)
  onProgress({ total: pending.length, done, failed, current: null })
}

const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder"

/** Google-native types we can export to an Office format (others — Forms, Drawings — are skipped). */
const GOOGLE_EXPORTS: Record<string, { mime: string; ext: string }> = {
  "application/vnd.google-apps.document": {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ext: ".docx",
  },
  "application/vnd.google-apps.spreadsheet": {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ext: ".xlsx",
  },
  "application/vnd.google-apps.presentation": {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ext: ".pptx",
  },
}

/**
 * Import Google Drive into PolarHQ Drive **preserving the folder hierarchy**, E2E-encrypted. We first
 * recreate the folders (parent-before-child), then upload each file into its mapped folder. Google-native
 * Docs/Sheets/Slides are **exported to Office formats** (.docx/.xlsx/.pptx); other native types (Forms,
 * Drawings) are skipped.
 */
export const importGoogleDrive = async (
  onProgress: (progress: MigrateProgress) => void,
  signal?: AbortSignal,
): Promise<void> => {
  const folders: GoogleDriveFile[] = []
  const files: GoogleDriveFile[] = []
  let pageToken: string | undefined
  do {
    if (signal?.aborted) return
    const page = await listDrivePage(pageToken)
    for (const entry of page.files) {
      if (entry.mimeType === DRIVE_FOLDER_MIME) folders.push(entry)
      else if (GOOGLE_EXPORTS[entry.mimeType]) files.push(entry)
      else if (!entry.mimeType.startsWith("application/vnd.google-apps") && entry.mimeType !== "")
        files.push(entry)
    }
    pageToken = page.nextPageToken
  } while (pageToken)

  // Resumability: what we've imported before. Folder entries carry their created PolarHQ node id, so a
  // resumed run reuses the existing tree instead of duplicating it; files are simply skipped.
  const imported = (await fetchImported("drive")).items
  const importedFiles = new Set(imported.map((entry) => entry.googleId))

  // Recreate the folder tree, parent before child. A Google parent that isn't itself one of the
  // folders we're importing (e.g. the "My Drive" root) maps to PolarHQ's root (null).
  const isOurFolder = new Set(folders.map((f) => f.id))
  const folderMap = new Map<string, string>() // Google folder id → PolarHQ node id
  for (const entry of imported) {
    if (entry.polarId && isOurFolder.has(entry.googleId)) folderMap.set(entry.googleId, entry.polarId)
  }
  const polarParent = (parents: string[]): string | null | undefined => {
    const inSet = parents.find((p) => isOurFolder.has(p))
    if (!inSet) return null // top-level / outside the import
    if (!folderMap.has(inSet)) return undefined // parent not made yet
    const mapped = folderMap.get(inSet)!
    return mapped === "" ? null : mapped // "" = a folder we gave up on → fall back to root
  }

  let guard = 0
  while (folderMap.size < folders.length && guard <= folders.length) {
    guard += 1
    for (const folder of folders) {
      if (signal?.aborted) return
      if (folderMap.has(folder.id)) continue
      const parent = polarParent(folder.parents)
      if (parent === undefined) continue // wait until its parent exists
      try {
        const { node } = await createDriveFolder(parent, folder.name)
        folderMap.set(folder.id, node.id)
        await markImported("drive", folder.id, node.id)
      } catch {
        folderMap.set(folder.id, "") // give up on this folder; its children fall back to root
      }
    }
  }
  const resolvedParent = (parents: string[]): string | null => {
    const p = polarParent(parents)
    return p ? p : null
  }

  const pending = files.filter((file) => !importedFiles.has(file.id))
  let done = 0
  let failed = 0
  for (const file of pending) {
    if (signal?.aborted) return
    onProgress({ total: pending.length, done, failed, current: file.name })
    try {
      const parentId = resolvedParent(file.parents)
      const exp = GOOGLE_EXPORTS[file.mimeType]
      const blob = await downloadProxy(
        exp
          ? `source=drive-export&fileId=${encodeURIComponent(file.id)}&exportMime=${encodeURIComponent(exp.mime)}`
          : `source=drive&fileId=${encodeURIComponent(file.id)}`,
      )
      const name = exp && !file.name.endsWith(exp.ext) ? `${file.name}${exp.ext}` : file.name
      const upload = new File([blob], name, {
        type: exp ? exp.mime : file.mimeType || "application/octet-stream",
      })
      if (upload.size > CHUNKED_UPLOAD_THRESHOLD)
        await uploadEncryptedDriveFileChunked(parentId, upload)
      else await uploadEncryptedDriveFile(parentId, upload)
      await markImported("drive", file.id, null)
    } catch {
      failed += 1
    }
    done += 1
  }
  onProgress({ total: pending.length, done, failed, current: null })
}
