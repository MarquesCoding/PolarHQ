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
import { ApiError } from "@polarhq/sdk/apiClient"
import { authClient } from "@lib/authClient"
import { apiErrorMessage } from "@lib/i18n/apiError"
import { type UploadOptions, postFormWithProgress } from "@polarhq/sdk/xhrUpload"
import { archiveDriveNodes } from "@lib/drive"
import {
  CHUNKED_UPLOAD_THRESHOLD,
  uploadEncryptedDriveFile,
  uploadEncryptedDriveFileChunked,
} from "@lib/driveE2e"
import { detectBurstGroups } from "@polarhq/core/burst"
import { isUnlocked } from "@lib/e2e"
import { pairLivePhotos } from "@polarhq/core/motionPhoto"
import {
  downloadDecryptedPhoto,
  uploadEncryptedMedia,
  uploadEncryptedMediaChunked,
} from "@lib/photosE2e"
import { type DownloadProgress, downloadAsset, downloadAssetsZip } from "@lib/download"
import { deleteAssets, fetchProcessing, stackAssets } from "@lib/photos"
import { type LiveEvent, useLiveEvents } from "@lib/useLiveEvents"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
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
  /** Whether a failed job can be re-run (a retry thunk was retained for it). */
  retriable?: boolean
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
  /** Ciphertext size in bytes; large files stream straight to disk on download. */
  size?: number
}

interface UploadManagerApi {
  items: UploadItem[]
  upload: (files: FileList | File[], target?: UploadTarget) => void
  download: (name: string, items: DownloadItem[]) => void
  /** Re-run a failed, retriable job (re-uploads, re-downloads, or re-runs the task). */
  retry: (id: string) => void
  /** Track an arbitrary download (e.g. a streamed Drive file) in the tray with byte progress. */
  downloadFile: (
    name: string,
    total: number,
    run: (onProgress: (loaded: number, speed: number) => void) => Promise<unknown>,
  ) => void
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
  file.type.startsWith("audio/") ||
  (!file.type && MEDIA_EXTENSION.test(file.name))

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
  options: UploadOptions,
): Promise<UploadResponse> => {
  const form = new FormData()
  form.set("file", file)
  if (file.lastModified) form.set("mtime", String(file.lastModified))
  if (target.kind === "drive") form.set("parentId", target.parentId)
  return postFormWithProgress<UploadResponse>(endpointFor(target), form, options)
}

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation("common")
  const { data: session } = authClient.useSession()
  const authed = Boolean(session?.user)
  const [items, setItems] = useState<UploadItem[]>([])
  const readyAssets = useRef<Set<string>>(new Set())
  const itemsRef = useRef<UploadItem[]>([])
  const requests = useRef<Map<string, XMLHttpRequest>>(new Map())
  const retries = useRef<Map<string, () => void>>(new Map())
  const queryClient = useQueryClient()

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    if (!authed) return
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
  }, [authed])

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

  const invalidateTimer = useRef<number | null>(null)
  const scheduleInvalidate = useCallback(() => {
    if (invalidateTimer.current !== null) return
    invalidateTimer.current = window.setTimeout(() => {
      invalidateTimer.current = null
      invalidate()
    }, 800)
  }, [invalidate])

  const upload = useCallback(
    (files: FileList | File[], target: UploadTarget = { kind: "photos" }) => {
      const all = Array.from(files)
      const motionByImage = new Map<File, File>()
      const resolvedIds = new Map<File, string>()
      let queue = all
      let burstGroups: Promise<File[][]> = Promise.resolve([])
      if (target.kind === "photos" && isUnlocked()) {
        const { uploads } = pairLivePhotos(all)
        queue = uploads.map((entry) => entry.file)
        for (const entry of uploads) if (entry.motion) motionByImage.set(entry.file, entry.motion)
        burstGroups = detectBurstGroups(queue).catch(() => [])
      }
      const jobs: { id: string; file: File }[] = []
      for (const file of queue) {
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
              error: t("uploadManager.unsupportedFileType"),
            },
            ...previous,
          ])
          toast.error(t("uploadManager.unsupportedFileTypeToast", { name: file.name }))
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
            retriable: true,
          },
          ...previous,
        ])
        jobs.push({ id, file })
      }

      const runJob = ({ id, file }: { id: string; file: File }) => {
        const options: UploadOptions = {
          onProgress: (progress) =>
            update(id, {
              loaded: progress.loaded,
              size: progress.total || file.size,
              speed: progress.speed,
            }),
          register: (xhr) => requests.current.set(id, xhr),
        }
        const uploadPromise =
          target.kind === "drive" && isUnlocked()
            ? (file.size >= CHUNKED_UPLOAD_THRESHOLD
                ? uploadEncryptedDriveFileChunked(target.parentId, file, options)
                : uploadEncryptedDriveFile(target.parentId, file, options)
              ).then((node) => ({ node }) as UploadResponse)
            : target.kind === "photos" && isUnlocked() && isMediaFile(file)
              ? (file.size >= CHUNKED_UPLOAD_THRESHOLD
                  ? uploadEncryptedMediaChunked(file, motionByImage.get(file), options)
                  : uploadEncryptedMedia(file, motionByImage.get(file), options)
                ).then((asset) => ({ asset, deduped: false }) as UploadResponse)
              : xhrUpload(file, target, options)
        return uploadPromise
          .then((response) => {
            const result = normalizeResponse(target, response, readyAssets.current)
            if (result.assetId) resolvedIds.set(file, result.assetId)
            update(id, { status: result.status, loaded: file.size, assetId: result.assetId })
            scheduleInvalidate()
          })
          .catch((error) => {
            if (error instanceof ApiError && error.message === "aborted") return
            update(id, { status: "error", error: apiErrorMessage(error) })
          })
          .finally(() => requests.current.delete(id))
      }

      for (const job of jobs) retries.current.set(job.id, () => void runJob(job))

      const CONCURRENCY = 4
      let cursor = 0
      const runners = Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
        while (cursor < jobs.length) {
          const job = jobs[cursor]
          cursor += 1
          if (job) await runJob(job)
        }
      })
      void Promise.all(runners).then(async () => {
        const groups = await burstGroups
        let stacked = false
        for (const group of groups) {
          const memberIds = group
            .map((file) => resolvedIds.get(file))
            .filter((value): value is string => Boolean(value))
          if (memberIds.length < 2) continue
          try {
            await stackAssets(memberIds)
            stacked = true
          } catch {
            /* leave the frames as standalone photos if stacking fails */
          }
        }
        if (stacked) invalidate()
      })
    },
    [update, scheduleInvalidate, invalidate],
  )

  const remove = useCallback(
    (id: string) => {
      const item = itemsRef.current.find((entry) => entry.id === id)
      if (item) {
        const request = requests.current.get(id)
        if (request && item.status === "uploading") request.abort()
        requests.current.delete(id)
        retries.current.delete(id)
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

  const retry = useCallback(
    (id: string) => {
      const start = retries.current.get(id)
      if (!start) return
      update(id, { status: "uploading", loaded: 0, speed: 0, error: undefined })
      start()
    },
    [update],
  )

  const download = useCallback(
    (name: string, downloads: DownloadItem[]) => {
      if (downloads.length === 0) return
      const id = nextId()
      setItems((previous) => [
        {
          id,
          kind: "download",
          name,
          size: 0,
          loaded: 0,
          speed: 0,
          status: "uploading",
          retriable: true,
        },
        ...previous,
      ])
      const onProgress = ({ received, total }: DownloadProgress) =>
        update(id, { loaded: received, size: total || 0 })

      const encrypted = downloads.filter((d) => d.encrypted)
      const plain = downloads.filter((d) => !d.encrypted)
      const run = async () => {
        for (const item of encrypted)
          await downloadDecryptedPhoto(item.id, item.name, item.size ?? 0, (progress) =>
            update(id, {
              loaded: progress.loaded,
              size: progress.total || (item.size ?? 0),
              speed: progress.speed,
            }),
          )
        if (plain.length === 1) await downloadAsset(plain[0]!.id, plain[0]!.name, onProgress)
        else if (plain.length > 1) await downloadAssetsZip(plain.map((p) => p.id), onProgress)
      }
      const start = () =>
        void run()
          .then(() => update(id, { status: "done" }))
          .catch(() => update(id, { status: "error", error: t("uploadManager.downloadFailed") }))
      retries.current.set(id, start)
      start()
    },
    [update],
  )

  const downloadFile = useCallback(
    (
      name: string,
      total: number,
      run: (onProgress: (loaded: number, speed: number) => void) => Promise<unknown>,
    ) => {
      const id = nextId()
      setItems((previous) => [
        {
          id,
          kind: "download",
          name,
          size: total,
          loaded: 0,
          speed: 0,
          status: "uploading",
          retriable: true,
        },
        ...previous,
      ])
      const start = () =>
        void run((loaded, speed) => update(id, { loaded, speed }))
          .then(() => update(id, { status: "done", loaded: total }))
          .catch((error) => update(id, { status: "error", error: apiErrorMessage(error) }))
      retries.current.set(id, start)
      start()
    },
    [update],
  )

  const archive = useCallback(
    (name: string, nodeIds: string[], parentId: string) => {
      const id = nextId()
      setItems((previous) => [
        {
          id,
          kind: "task",
          name,
          size: 0,
          loaded: 0,
          speed: 0,
          status: "uploading",
          retriable: true,
        },
        ...previous,
      ])
      const start = () =>
        archiveDriveNodes(nodeIds, parentId, id)
          .then(() => {
            update(id, { status: "done" })
            invalidate()
          })
          .catch(() => update(id, { status: "error", error: t("uploadManager.archiveFailed") }))
      retries.current.set(id, start)
      void start()
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
        {
          id,
          kind: "task",
          name,
          size: total,
          loaded: 0,
          speed: 0,
          status: "uploading",
          retriable: true,
        },
        ...previous,
      ])
      const start = () =>
        void run((done) => update(id, { loaded: done }))
          .then(() => {
            update(id, { status: "done", loaded: total })
            invalidate()
          })
          .catch(() => update(id, { status: "error", error: t("uploadManager.taskFailed") }))
      retries.current.set(id, start)
      start()
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
  useLiveEvents(onEvent, authed)

  return (
    <UploadContext.Provider
      value={{ items, upload, download, downloadFile, archive, task, remove, clearFinished, retry }}
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
