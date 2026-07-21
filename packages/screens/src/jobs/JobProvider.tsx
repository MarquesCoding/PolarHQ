import { type ReactNode, createContext, useContext, useEffect, useState } from "react"
import { type Job, getHost } from "@workspace/core/host"

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

/**
 * Reactive view of the desktop job store — hydrates from the Rust `JobManager` and subscribes to
 * `job://update`/`job://removed`. On web (no `host.jobs`) it stays empty and inert; uploads there keep
 * flowing through the existing upload manager.
 */
export const JobProvider = ({ children }: { children: ReactNode }) => {
  const [jobs, setJobs] = useState<Job[]>([])

  useEffect(() => {
    const host = getHost().jobs
    if (!host) return
    let active = true
    void host.list().then((list) => {
      if (active) setJobs(list)
    })
    const unsubscribe = host.subscribe(
      (job) =>
        setJobs((prev) => {
          const next = prev.filter((existing) => existing.id !== job.id)
          next.unshift(job)
          return next
        }),
      (id) => setJobs((prev) => prev.filter((existing) => existing.id !== id)),
    )
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const cancel = (id: string) => void getHost().jobs?.cancel(id)
  const remove = (id: string) => void getHost().jobs?.remove(id)

  return <JobContext.Provider value={{ jobs, cancel, remove }}>{children}</JobContext.Provider>
}

export const useJobs = (): JobContextValue => useContext(JobContext)
