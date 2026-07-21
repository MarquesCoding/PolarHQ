import { listen } from "@tauri-apps/api/event"
import { type Store, load } from "@tauri-apps/plugin-store"
import {
  type SyncEntry,
  jobs,
  pickFolder,
  syncIndex,
  syncReadFile,
  syncStartWatch,
  syncStopWatch,
} from "@lib/native"
import { createDriveFolder } from "@workspace/core/drive"
import {
  CHUNKED_UPLOAD_THRESHOLD,
  uploadEncryptedDriveFile,
  uploadEncryptedDriveFileChunked,
} from "@workspace/core/driveE2e"
import type {
  SyncBridge,
  SyncProgress,
  SyncResult,
  SyncedFolderInfo,
} from "@workspace/screens/syncBridge"

/**
 * Desktop folder-sync controller (Phase 2). Rust walks + hashes the folder ([[sync.rs]]); here we
 * reconcile that index against a persisted manifest and push new/changed files up to Drive through the
 * **same E2E path as a normal upload** — so synced content is encrypted client-side and the server only
 * ever stores ciphertext. One-way (local → Drive) for now; the folder hierarchy is recreated in Drive.
 */

const STORE_FILE = "sync.json"
const FOLDERS_KEY = "folders"

/** A file/folder we've already pushed: its Drive node id + the content hash we last uploaded. */
interface ManifestEntry {
  nodeId: string
  hash: string
  dir: boolean
}

interface FolderRecord {
  id: string
  localPath: string
  name: string
  /** The Drive folder this local folder syncs into. */
  driveNodeId: string
  /** relPath → what we've pushed, so re-syncs skip unchanged files and reuse created folders. */
  manifest: Record<string, ManifestEntry>
  lastSyncedAt: number | null
}

const trimTrailing = (path: string): string => path.replace(/[\\/]+$/, "")
const baseName = (path: string): string => {
  const norm = trimTrailing(path)
  const i = Math.max(norm.lastIndexOf("/"), norm.lastIndexOf("\\"))
  return i < 0 ? norm : norm.slice(i + 1)
}
const relDir = (rel: string): string => {
  const i = rel.lastIndexOf("/")
  return i < 0 ? "" : rel.slice(0, i)
}
const relName = (rel: string): string => {
  const i = rel.lastIndexOf("/")
  return i < 0 ? rel : rel.slice(i + 1)
}
/** Join a sync root with a POSIX rel path, honouring the root's separator (Windows-safe). */
const joinPath = (root: string, rel: string): string => {
  const sep = root.includes("\\") && !root.includes("/") ? "\\" : "/"
  return `${trimTrailing(root)}${sep}${rel.split("/").join(sep)}`
}

let storePromise: Promise<Store> | null = null
const store = (): Promise<Store> => {
  if (!storePromise) storePromise = load(STORE_FILE, { autoSave: false, defaults: {} })
  return storePromise
}

const readRecords = async (): Promise<FolderRecord[]> =>
  (await (await store()).get<FolderRecord[]>(FOLDERS_KEY)) ?? []

const writeRecords = async (records: FolderRecord[]): Promise<void> => {
  const s = await store()
  await s.set(FOLDERS_KEY, records)
  await s.save()
}

const toInfo = (record: FolderRecord): SyncedFolderInfo => ({
  id: record.id,
  localPath: record.localPath,
  name: record.name,
  fileCount: Object.values(record.manifest).filter((entry) => !entry.dir).length,
  driveNodeId: record.driveNodeId,
  lastSyncedAt: record.lastSyncedAt,
})

const list = async (): Promise<SyncedFolderInfo[]> => (await readRecords()).map(toInfo)

const add = async (): Promise<SyncedFolderInfo | null> => {
  const picked = await pickFolder()
  if (!picked) return null
  const records = await readRecords()
  const existing = records.find((record) => record.localPath === picked)
  if (existing) return toInfo(existing)

  const name = baseName(picked) || picked
  const { node } = await createDriveFolder(null, name)
  const record: FolderRecord = {
    id: crypto.randomUUID(),
    localPath: picked,
    name,
    driveNodeId: node.id,
    manifest: {},
    lastSyncedAt: null,
  }
  await writeRecords([...records, record])
  void syncStartWatch(picked).catch(() => undefined)
  return toInfo(record)
}

const remove = async (id: string): Promise<void> => {
  const records = await readRecords()
  const record = records.find((entry) => entry.id === id)
  if (record) void syncStopWatch(record.localPath).catch(() => undefined)
  await writeRecords(records.filter((entry) => entry.id !== id))
}

const sync = async (
  id: string,
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> => {
  const records = await readRecords()
  const record = records.find((entry) => entry.id === id)
  if (!record) return { uploaded: 0, failed: 0 }

  const jobId = await jobs.create("sync", record.name, record.id).catch(() => null)
  const report = (patch: Parameters<typeof jobs.report>[1]) => {
    if (jobId) void jobs.report(jobId, patch).catch(() => undefined)
  }
  report({ state: "running", current: null })

  const entries: SyncEntry[] = await syncIndex(record.localPath)
  const dirs = entries
    .filter((entry) => entry.isDir)
    .sort((a, b) => a.relPath.split("/").length - b.relPath.split("/").length)
  const files = entries.filter((entry) => !entry.isDir)

  // Publish the real total up front so the UI shows "0/N" (or an honest 0/0 for an empty folder)
  // immediately, instead of sitting at the seeded 0/0 until the first file is processed.
  onProgress?.({ total: files.length, done: 0, current: null })
  report({ total: files.length, done: 0 })

  // Recreate the folder tree, parent before child. Seed from the manifest so a re-sync reuses folders
  // it already made instead of duplicating them.
  const folderMap = new Map<string, string>([["", record.driveNodeId]])
  for (const [rel, entry] of Object.entries(record.manifest)) {
    if (entry.dir) folderMap.set(rel, entry.nodeId)
  }
  for (const dir of dirs) {
    if (folderMap.has(dir.relPath)) continue
    const parent = folderMap.get(relDir(dir.relPath)) ?? record.driveNodeId
    try {
      const { node } = await createDriveFolder(parent, relName(dir.relPath))
      folderMap.set(dir.relPath, node.id)
      record.manifest[dir.relPath] = { nodeId: node.id, hash: "", dir: true }
    } catch {
      // leave unmapped; its children fall back to the sync root
    }
  }

  let uploaded = 0
  let failed = 0
  let done = 0
  let cancelled = false
  for (const file of files) {
    if (jobId && (await jobs.cancelled(jobId).catch(() => false))) {
      cancelled = true
      break
    }
    onProgress?.({ total: files.length, done, current: relName(file.relPath) })
    report({ done, current: relName(file.relPath) })
    const prev = record.manifest[file.relPath]
    if (prev && !prev.dir && prev.hash === file.hash) {
      done += 1
      continue // unchanged since the last sync
    }
    try {
      const parent = folderMap.get(relDir(file.relPath)) ?? record.driveNodeId
      const bytes = await syncReadFile(joinPath(record.localPath, file.relPath))
      const upload = new File([new Uint8Array(bytes)], relName(file.relPath))
      const node =
        bytes.byteLength > CHUNKED_UPLOAD_THRESHOLD
          ? await uploadEncryptedDriveFileChunked(parent, upload)
          : await uploadEncryptedDriveFile(parent, upload)
      record.manifest[file.relPath] = { nodeId: node.id, hash: file.hash, dir: false }
      uploaded += 1
    } catch {
      failed += 1
    }
    done += 1
  }

  record.lastSyncedAt = Date.now()
  await writeRecords(records)
  onProgress?.({ total: files.length, done, current: null })
  report(
    cancelled
      ? { state: "cancelled", done }
      : failed > 0
        ? {
            state: "failed",
            done,
            error: `${failed} of ${files.length} file(s) failed to upload`,
            retriable: true,
          }
        : { state: "done", done, current: null },
  )
  return { uploaded, failed }
}

const syncing = new Set<string>()
const debouncers = new Map<string, ReturnType<typeof setTimeout>>()

/** Sync a folder unless one is already in flight for it — auto-sync fires can overlap a manual sync. */
const safeSync = async (id: string): Promise<void> => {
  if (syncing.has(id)) return
  syncing.add(id)
  try {
    await sync(id)
  } catch {
    // best-effort; a manual "Sync now" surfaces errors
  } finally {
    syncing.delete(id)
  }
}

let started = false
/**
 * Watch every synced folder and auto-push changes to Drive (debounced). The Rust watcher emits
 * `sync://change` with the folder's root path on any filesystem change; we coalesce a burst into one
 * background sync. Idempotent — safe to call once at startup.
 */
const start = async (): Promise<void> => {
  if (started) return
  started = true
  const records = await readRecords()
  await Promise.all(records.map((record) => syncStartWatch(record.localPath).catch(() => undefined)))
  await listen<string>("sync://change", (event) => {
    const path = event.payload
    clearTimeout(debouncers.get(path))
    debouncers.set(
      path,
      setTimeout(() => {
        void readRecords().then((current) => {
          const record = current.find((entry) => entry.localPath === path)
          if (record) void safeSync(record.id)
        })
      }, 2000),
    )
  })
}

const syncBridge: SyncBridge = { list, add, remove, sync }

/** Register the bridge on `window.__polarSync` and begin watching synced folders for live auto-upload. */
export const registerSyncBridge = (): void => {
  window.__polarSync = syncBridge
  void start()
}
