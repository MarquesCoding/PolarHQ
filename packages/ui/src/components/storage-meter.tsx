interface StorageMeterProps {
  percent: number
  label?: string
  footer?: string
  collapsed?: boolean
}

const RADIUS = 13
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

/** Shared storage-usage footer (presentational; the consumer computes usage/labels). */
const StorageMeter = ({ percent, label, footer, collapsed }: StorageMeterProps) => {
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
    <div className="mt-auto flex flex-col gap-1.5 px-1.5 pb-1">
      {label ? (
        <>
          <div className="bg-sidebar-accent h-1.5 w-full overflow-hidden rounded-full">
            <div className="bg-primary h-full rounded-full" style={{ width: `${percent}%` }} />
          </div>
          <p className="text-muted-foreground text-center text-xs">{label}</p>
        </>
      ) : null}
      {footer ? (
        <p className="text-muted-foreground/60 pt-0.5 text-center font-mono text-[10px] tracking-tight">
          {footer}
        </p>
      ) : null}
    </div>
  )
}

export default StorageMeter
