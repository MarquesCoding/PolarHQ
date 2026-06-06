"use client"

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { API_URL } from "@lib/env"
import { archiveDriveNodes } from "@lib/drive"
import { uploadEncryptedDriveFile } from "@lib/driveE2e"
import { isUnlocked } from "@lib/e2e"
import { downloadDecryptedPhoto, uploadEncryptedMedia } from "@lib/photosE2e"
import { type DownloadProgress, downloadAsset, downloadAssetsZip } from "@lib/download"
import { deleteAssets, fetchProcessing } from "@lib/photos"
import { type LiveEvent, useLiveEvents } from "@lib/useLiveEvents"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

export type UploadStatus = "uploading" | "processing" | "done" | "deduped" | "error"

export type MediaType = "image" | "video" | "audio"

export interface UploadItem {
  id: string
  kind: "upload" | "download" | "task"
  name: string
  size: number
  loaded: number
  speed: number
  status: UploadStatus
  mediaType?: MediaType
  assetId?: string
  error?: string
}

const mediaTypeFromName = (name: string): MediaType => {
  if (/\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(name)) return "video"
  if (/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(name)) return "audio"
  return "image"
}

const mediaTypeFromFile = (file: File): MediaType =>
  file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "image"

const MEDIA_EXTENSION =
  /\.(jpe?g|png|gif|webp|avif|bmp|tiff?|heic|heif|mp4|mov|m4v|webm|avi|mkv|mp3|wav|m4a|aac|ogg|flac)$/i
const isSupportedMedia = (file: File): boolean =>
  file.type.startsWith("image/") ||
  file.type.startsWith("video/") ||
  file.type.startsWith("audio/") ||
  (!file.type && MEDIA_EXTENSION.test(file.name))

/** Where an upload goes: the Photos library, or a specific Drive folder. */
export type UploadTarget = { kind: "photos" } | { kind: "drive"; parentId: string }

/** A photo to download — encrypted ones are decrypted client-side before saving. */
export interface DownloadItem {
  id: string
  name: string
  encrypted: boolean
}

interface UploadManagerApi {
  items: UploadItem[]
  upload: (files: FileList | File[], target?: UploadTarget) => void
  download: (name: string, items: DownloadItem[]) => void
  archive: (name: string, nodeIds: string[], parentId: string) => void
  task: (
    name: string,
    total: number,
    run: (onProgress: (done: number) => void) => Promise<unknown>,
  ) => void
  remove: (id: string) => void
  clearFinished: () => void
}

interface PhotosUploadResponse {
  asset: { id: string; status: string }
  deduped: boolean
}

interface DriveUploadResponse {
  node: { id: string; photoAssetId: string | null }
  registeredInPhotos?: boolean
}

type UploadResponse = PhotosUploadResponse | DriveUploadResponse

interface NormalizedUpload {
  assetId?: string
  status: "done" | "processing" | "deduped"
}

const isMediaFile = (file: File): boolean =>
  file.type.startsWith("image/") ||
  file.type.startsWith("video/") ||
  file.type.startsWith("audio/")

const endpointFor = (target: UploadTarget): string =>
  target.kind === "drive"
    ? `${API_URL}/api/v1/drive/nodes/upload`
    : `${API_URL}/api/v1/photos/assets`

const normalizeResponse = (
  target: UploadTarget,
  raw: UploadResponse,
  ready: Set<string>,
): NormalizedUpload => {
  if (target.kind === "drive") {
    const { node, registeredInPhotos } = raw as DriveUploadResponse
    if (registeredInPhotos && node.photoAssetId) {
      return {
        assetId: node.photoAssetId,
        status: ready.has(node.photoAssetId) ? "done" : "processing",
      }
    }
    return { status: "done" }
  }
  const { asset, deduped } = raw as PhotosUploadResponse
  if (deduped) return { assetId: asset.id, status: "deduped" }
  return {
    assetId: asset.id,
    status: asset.status === "ready" || ready.has(asset.id) ? "done" : "processing",
  }
}

const UploadContext = createContext<UploadManagerApi | null>(null)

let counter = 0
const nextId = (): string => {
  counter += 1
  return `upload-${counter}`
}

const xhrUpload = (
  file: File,
  target: UploadTarget,
  onProgress: (loaded: number, speed: number) => void,
  onStart: (xhr: XMLHttpRequest) => void,
): Promise<UploadResponse> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    onStart(xhr)
    const form = new FormData()
    form.set("file", file)
    if (file.lastModified) form.set("mtime", String(file.lastModified))
    if (target.kind === "drive") form.set("parentId", target.parentId)
    const start = performance.now()

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      const elapsed = (performance.now() - start) / 1000
      onProgress(event.loaded, elapsed > 0 ? event.loaded / elapsed : 0)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResponse)
        } catch {
          reject(new Error("Invalid upload response"))
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status})`))
      }
    }
    xhr.onerror = () => reject(new Error("Network error"))
    xhr.open("POST", endpointFor(target))
    xhr.withCredentials = true
    xhr.send(form)
  })

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<UploadItem[]>([])
  const readyAssets = useRef<Set<string>>(new Set())
  const itemsRef = useRef<UploadItem[]>([])
  const requests = useRef<Map<string, XMLHttpRequest>>(new Map())
  const queryClient = useQueryClient()

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    void fetchProcessing()
      .then(({ assets }) => {
        if (assets.length === 0) return
        setItems((previous) => {
          const known = new Set(previous.map((item) => item.assetId))
          const restored: UploadItem[] = assets
            .filter((asset) => !known.has(asset.id))
            .map((asset) => ({
              id: `proc-${asset.id}`,
              kind: "upload" as const,
              name: asset.originalFilename,
              size: 0,
              loaded: 0,
              speed: 0,
              status: "processing" as const,
              mediaType: mediaTypeFromName(asset.originalFilename),
              assetId: asset.id,
            }))
          return [...restored, ...previous]
        })
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (items.length === 0) return
    const allDone = items.every(
      (item) =>
        item.status === "done" || item.status === "deduped" || item.status === "error",
    )
    if (!allDone) return
    const timeout = window.setTimeout(() => setItems([]), 10_000)
    return () => clearTimeout(timeout)
  }, [items])

  const update = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((previous) => previous.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["photos"] })
    void queryClient.invalidateQueries({ queryKey: ["drive"] })
  }, [queryClient])

  const upload = useCallback(
    (files: FileList | File[], target: UploadTarget = { kind: "photos" }) => {
      for (const file of Array.from(files)) {
        const id = nextId()
        if (target.kind === "photos" && !isSupportedMedia(file)) {
          setItems((previous) => [
            {
              id,
              kind: "upload",
              name: file.name,
              size: file.size,
              loaded: 0,
              speed: 0,
              status: "error",
              error: "Unsupported file type",
            },
            ...previous,
          ])
          toast.error(`${file.name} is an unsupported file type`)
          continue
        }
        setItems((previous) => [
          {
            id,
            kind: "upload",
            name: file.name,
            size: file.size,
            loaded: 0,
            speed: 0,
            status: "uploading",
            mediaType: isMediaFile(file) ? mediaTypeFromFile(file) : undefined,
          },
          ...previous,
        ])
        const uploadPromise =
          target.kind === "drive" && isUnlocked()
            ? uploadEncryptedDriveFile(target.parentId, file).then(
                (node) => ({ node }) as UploadResponse,
              )
            : target.kind === "photos" && isUnlocked() && isMediaFile(file)
              ? uploadEncryptedMedia(file).then(
                  (asset) => ({ asset, deduped: false }) as UploadResponse,
                )
              : xhrUpload(
                  file,
                  target,
                  (loaded, speed) => update(id, { loaded, speed }),
                  (xhr) => requests.current.set(id, xhr),
                )
        uploadPromise
          .then((response) => {
            const result = normalizeResponse(target, response, readyAssets.current)
            update(id, { status: result.status, loaded: file.size, assetId: result.assetId })
            invalidate()
          })
          .catch(() => update(id, { status: "error" }))
          .finally(() => requests.current.delete(id))
      }
    },
    [update, invalidate],
  )

  const remove = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((entry) => entry.id === id)
      if (item) {
        const request = requests.current.get(id)
        if (request && item.status === "uploading") request.abort()
        requests.current.delete(id)
        const removable = item.status === "processing" || item.status === "done"
        if (item.assetId && removable) {
          void deleteAssets([item.assetId])
            .then(invalidate)
            .catch(() => undefined)
        }
      }
      setItems((previous) => previous.filter((entry) => entry.id !== id))
    },
    [invalidate],
  )

  const clearFinished = useCallback(
    () =>
      setItems((previous) =>
        previous.filter((item) => item.status === "uploading" || item.status === "processing"),
      ),
    [],
  )

  const download = useCallback(
    (name: string, downloads: DownloadItem[]) => {
      if (downloads.length === 0) return
      const id = nextId()
      setItems((previous) => [
        { id, kind: "download", name, size: 0, loaded: 0, speed: 0, status: "uploading" },
        ...previous,
      ])
      const onProgress = ({ received, total }: DownloadProgress) =>
        update(id, { loaded: received, size: total || 0 })

      const encrypted = downloads.filter((d) => d.encrypted)
      const plain = downloads.filter((d) => !d.encrypted)
      const run = async () => {
        for (const item of encrypted) await downloadDecryptedPhoto(item.id, item.name)
        if (plain.length === 1) await downloadAsset(plain[0]!.id, plain[0]!.name, onProgress)
        else if (plain.length > 1) await downloadAssetsZip(plain.map((p) => p.id), onProgress)
      }
      void run()
        .then(() => update(id, { status: "done" }))
        .catch(() => update(id, { status: "error", error: "Download failed" }))
    },
    [update],
  )

  const archive = useCallback(
    (name: string, nodeIds: string[], parentId: string) => {
      const id = nextId()
      setItems((previous) => [
        { id, kind: "task", name, size: 0, loaded: 0, speed: 0, status: "uploading" },
        ...previous,
      ])
      archiveDriveNodes(nodeIds, parentId, id)
        .then(() => {
          update(id, { status: "done" })
          invalidate()
        })
        .catch(() => update(id, { status: "error", error: "Archive failed" }))
    },
    [update, invalidate],
  )

  const task = useCallback(
    (
      name: string,
      total: number,
      run: (onProgress: (done: number) => void) => Promise<unknown>,
    ) => {
      const id = nextId()
      setItems((previous) => [
        { id, kind: "task", name, size: total, loaded: 0, speed: 0, status: "uploading" },
        ...previous,
      ])
      void run((done) => update(id, { loaded: done }))
        .then(() => {
          update(id, { status: "done", loaded: total })
          invalidate()
        })
        .catch(() => update(id, { status: "error", error: "Failed" }))
    },
    [update, invalidate],
  )

  const onEvent = useCallback(
    (event: LiveEvent) => {
      if (event.type === "drive.archive.progress") {
        const data = event.payload as { archiveId?: string; done?: number; total?: number } | null
        if (!data?.archiveId) return
        setItems((previous) =>
          previous.map((item) =>
            item.id === data.archiveId
              ? { ...item, loaded: data.done ?? item.loaded, size: data.total ?? item.size }
              : item,
          ),
        )
        return
      }

      const payload = event.payload as { assetId?: string } | null
      const assetId = payload?.assetId
      if (!assetId) return

      if (event.type === "photos.asset.thumbnail.ready") {
        readyAssets.current.add(assetId)
        setItems((previous) =>
          previous.map((item) =>
            item.assetId === assetId && item.status === "processing"
              ? { ...item, status: "done" }
              : item,
          ),
        )
        invalidate()
      } else if (event.type === "photos.asset.failed") {
        setItems((previous) =>
          previous.map((item) => (item.assetId === assetId ? { ...item, status: "error" } : item)),
        )
      }
    },
    [invalidate],
  )
  useLiveEvents(onEvent)

  return (
    <UploadContext.Provider
      value={{ items, upload, download, archive, task, remove, clearFinished }}
    >
      {children}
    </UploadContext.Provider>
  )
}

export const useUploadManager = (): UploadManagerApi => {
  const context = useContext(UploadContext)
  if (!context) throw new Error("useUploadManager must be used within an UploadProvider")
  return context
}
