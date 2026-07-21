import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react"
import { type Job, getHost } from "@workspace/core/host"
import { getSyncBridge } from "@workspace/screens/syncBridge"
import { type UploadItem, useUploadManager } from "@workspace/screens/uploadManager"

interface JobContextValue {
  jobs: Job[]
  cancel: (id: string) => void
  remove: (id: string) => void
  /** Re-run a failed/interrupted job. No-op for jobs whose action can't be replayed (e.g. a splat,
   *  which needs its source image). */
  retry: (id: string) => void
}

const JobContext = createContext<JobContextValue>({
  jobs: [],
  cancel: () => {},
  remove: () => {},
  retry: () => {},
})

/** Re-run a Rust-native job by kind. Returns false when the kind can't be replayed. */
const replayJob = (job: Job): boolean => {
  if (job.kind === "sync" && job.key) {
    void getSyncBridge()?.sync(job.key)
    return true
  }
  if (job.kind === "sharpSetup") {
    void getHost().sharpSetup?.()
    return true
  }
  return false
}

/** Prefix marking a merged upload-manager item, so cancel/remove routes back to it (not the Rust store). */
const UPLOAD_PREFIX = "upload:"

const uploadToJob = (item: UploadItem): Job => ({
  id: `${UPLOAD_PREFIX}${item.id}`,
  key: null,
  kind: item.kind,
  name: item.name,
  state:
    item.status === "error"
      ? "failed"
      : item.status === "done" || item.status === "deduped"
        ? "done"
        : "running",
  progress: { done: item.loaded, total: item.size, current: null },
  error: item.error ?? null,
  retriable: item.retriable ?? false,
  createdAt: 0,
  updatedAt: 0,
})

/**
 * Reactive view of every background action. Rust-native jobs (sync, splat, SHARP setup) come from the
 * desktop `JobManager` over `job://update`; the browser upload manager's items (uploads, downloads,
 * tasks) are merged in so one panel shows them all. On web there's no Rust store — only the upload
 * items appear (the existing upload manager is untouched).
 */
export const JobProvider = ({ children }: { children: ReactNode }) => {
  const [rustJobs, setRustJobs] = useState<Job[]>([])
  const upload = useUploadManager()

  useEffect(() => {
    const host = getHost().jobs
    if (!host) return
    let active = true
    void host.list().then((list) => {
      if (!active) return
      setRustJobs(list)
      // Resume-on-restart: anything the store marked Interrupted (was running when the app last
      // closed) and can be safely replayed is re-queued now; its stale entry is dropped so the fresh
      // run's job takes its place. Splats aren't replayable, so they just stay flagged for a manual look.
      for (const job of list) {
        if (job.state === "interrupted" && replayJob(job)) void host.remove(job.id)
      }
    })
    const unsubscribe = host.subscribe(
      (job) =>
        setRustJobs((prev) => {
          const next = prev.filter((existing) => existing.id !== job.id)
          next.unshift(job)
          return next
        }),
      (id) => setRustJobs((prev) => prev.filter((existing) => existing.id !== id)),
    )
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const jobs = useMemo(
    () => [...rustJobs, ...upload.items.map(uploadToJob)],
    [rustJobs, upload.items],
  )

  const cancel = (id: string) => {
    if (id.startsWith(UPLOAD_PREFIX)) upload.remove(id.slice(UPLOAD_PREFIX.length))
    else void getHost().jobs?.cancel(id)
  }
  const remove = (id: string) => {
    if (id.startsWith(UPLOAD_PREFIX)) upload.remove(id.slice(UPLOAD_PREFIX.length))
    else void getHost().jobs?.remove(id)
  }
  const retry = (id: string) => {
    if (id.startsWith(UPLOAD_PREFIX)) {
      upload.retry(id.slice(UPLOAD_PREFIX.length))
      return
    }
    const job = rustJobs.find((existing) => existing.id === id)
    if (job && replayJob(job)) void getHost().jobs?.remove(id)
  }

  return (
    <JobContext.Provider value={{ jobs, cancel, remove, retry }}>{children}</JobContext.Provider>
  )
}

export const useJobs = (): JobContextValue => useContext(JobContext)
