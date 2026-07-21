import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react"
import { type Job, getHost } from "@workspace/core/host"
import { type UploadItem, useUploadManager } from "@workspace/screens/uploadManager"

interface JobContextValue {
  jobs: Job[]
  cancel: (id: string) => void
  remove: (id: string) => void
}

const JobContext = createContext<JobContextValue>({
  jobs: [],
  cancel: () => {},
  remove: () => {},
})

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
      if (active) setRustJobs(list)
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

  return <JobContext.Provider value={{ jobs, cancel, remove }}>{children}</JobContext.Provider>
}

export const useJobs = (): JobContextValue => useContext(JobContext)
