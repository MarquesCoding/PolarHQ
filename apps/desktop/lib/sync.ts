import { open } from "@tauri-apps/plugin-dialog"
import { type Store, load } from "@tauri-apps/plugin-store"
import { type SyncEntry, syncIndex, syncReadFile } from "@lib/native"
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
  lastSyncedAt: record.lastSyncedAt,
})

const list = async (): Promise<SyncedFolderInfo[]> => (await readRecords()).map(toInfo)

const add = async (): Promise<SyncedFolderInfo | null> => {
  const picked = await open({ directory: true, multiple: false })
  if (!picked || typeof picked !== "string") return null
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
  return toInfo(record)
}

const remove = async (id: string): Promise<void> => {
  const records = await readRecords()
  await writeRecords(records.filter((record) => record.id !== id))
}

const sync = async (
  id: string,
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> => {
  const records = await readRecords()
  const record = records.find((entry) => entry.id === id)
  if (!record) return { uploaded: 0, failed: 0 }

  const entries: SyncEntry[] = await syncIndex(record.localPath)
  const dirs = entries
    .filter((entry) => entry.isDir)
    .sort((a, b) => a.relPath.split("/").length - b.relPath.split("/").length)
  const files = entries.filter((entry) => !entry.isDir)

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
  for (const file of files) {
    onProgress?.({ total: files.length, done, current: relName(file.relPath) })
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
  return { uploaded, failed }
}

const syncBridge: SyncBridge = { list, add, remove, sync }

/** Register the bridge on `window.__polarSync` so the shared Account UI can drive it. */
export const registerSyncBridge = (): void => {
  window.__polarSync = syncBridge
}
