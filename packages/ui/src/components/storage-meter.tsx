import type { ReactNode } from "react"

interface StorageMeterProps {
  percent: number
  /** Heading shown on the left of the usage row (e.g. "Storage"). */
  title?: string
  /** Usage figure shown on the right of the heading (e.g. "185 MB / 1.0 GB"). */
  label?: string
  footer?: ReactNode
  collapsed?: boolean
}

const RADIUS = 13
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Shared storage-usage footer (presentational; the consumer computes usage/labels). */
const StorageMeter = ({ percent, title = "Storage", label, footer, collapsed }: StorageMeterProps) => {
  if (collapsed) {
    return (
      <div className="mt-auto flex justify-center pb-1">
        <div className="relative size-9" title={label}>
          <svg viewBox="0 0 36 36" className="size-9 -rotate-90">
            <circle
              cx="18"
              cy="18"
              r={RADIUS}
              fill="none"
              strokeWidth="3.5"
              className="stroke-sidebar-accent"
            />
            <circle
              cx="18"
              cy="18"
              r={RADIUS}
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="stroke-primary"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, percent)) / 100)}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium tabular-nums">
            {Math.round(percent)}%
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-auto flex flex-col gap-2 px-2.5 pt-1 pb-1.5">
      {label ? (
        <>
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">{title}</span>
            <span className="text-foreground/80 tabular-nums">{label}</span>
          </div>
          <div className="bg-sidebar-accent h-1.5 w-full overflow-hidden rounded-full">
            <div className="bg-primary h-full rounded-full" style={{ width: `${percent}%` }} />
          </div>
        </>
      ) : null}
      {footer ? (
        <div className="text-muted-foreground/50 pt-0.5 font-mono text-[10px] tracking-tight">
          {footer}
        </div>
      ) : null}
    </div>
  )
}

export default StorageMeter
