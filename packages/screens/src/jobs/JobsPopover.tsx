import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import type { Job } from "@workspace/core/host"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { X } from "@phosphor-icons/react"
import { useJobs } from "./JobProvider"

const STATE_DOT: Record<Job["state"], string> = {
  running: "bg-primary animate-pulse",
  queued: "bg-muted-foreground/50",
  done: "bg-emerald-500",
  failed: "bg-red-500",
  cancelled: "bg-muted-foreground/40",
  interrupted: "bg-amber-500",
}

const JobRow = ({
  job,
  onCancel,
  onRemove,
}: {
  job: Job
  onCancel: (id: string) => void
  onRemove: (id: string) => void
}) => {
  const { t } = useTranslation("drive")
  const active = job.state === "running" || job.state === "queued"
  const pct =
    job.progress.total > 0 ? Math.round((job.progress.done / job.progress.total) * 100) : 0
  return (
    <div className="hover:bg-sidebar-accent/40 flex flex-col gap-1.5 rounded-lg px-2.5 py-2 transition">
      <div className="flex items-center gap-2">
        <span className={cn("size-1.5 shrink-0 rounded-full", STATE_DOT[job.state])} />
        <span className="flex-1 truncate text-sm font-medium">{job.name}</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={active ? t("jobs.cancel", { defaultValue: "Cancel" }) : t("jobs.dismiss", { defaultValue: "Dismiss" })}
          onClick={() => (active ? onCancel(job.id) : onRemove(job.id))}
          className="size-6 shrink-0 rounded-full"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      {active && job.progress.total > 0 ? (
        <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
      <span className="text-muted-foreground truncate text-[11px]">
        {job.error ?? job.progress.current ?? t(`jobs.state.${job.state}`, { defaultValue: job.state })}
      </span>
    </div>
  )
}

interface JobsPopoverProps {
  trigger: ReactNode
  title: string
  emptyLabel: string
  filter?: (job: Job) => boolean
  triggerLabel: string
}

/** A sidebar-footer popover listing jobs from the store — reused for both the Job Manager (all jobs)
 *  and the Sync Monitor (sync jobs). */
const JobsPopover = ({ trigger, title, emptyLabel, filter, triggerLabel }: JobsPopoverProps) => {
  const { jobs, cancel, remove } = useJobs()
  const shown = filter ? jobs.filter(filter) : jobs
  const running = shown.filter((job) => job.state === "running").length

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={triggerLabel}
            className="text-muted-foreground hover:text-foreground relative size-8 rounded-full"
          />
        }
      >
        {trigger}
        {running > 0 ? (
          <span className="bg-primary absolute top-1 right-1 size-1.5 rounded-full" />
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="start" side="top" sideOffset={10} className="w-72 p-0">
        <div className="border-border/60 flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">{title}</span>
          {running > 0 ? (
            <span className="text-muted-foreground text-xs tabular-nums">{running}</span>
          ) : null}
        </div>
        <div className="scrollbar-slim max-h-72 overflow-y-auto p-1">
          {shown.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">{emptyLabel}</p>
          ) : (
            shown.map((job) => (
              <JobRow key={job.id} job={job} onCancel={cancel} onRemove={remove} />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default JobsPopover
