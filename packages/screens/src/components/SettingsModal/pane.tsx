import { type ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

/** Scrollable content frame for a settings pane — matches the admin `AdminPage` metrics. */
export const Pane = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-8 py-8">
      <h1 className="text-xl font-semibold">{title}</h1>
      {children}
    </div>
  </div>
)

export const PaneSection = ({ title, children }: { title?: string; children: ReactNode }) => (
  <section className="flex flex-col">
    {title ? (
      <h2 className="text-muted-foreground mb-1 text-xs font-semibold tracking-wider uppercase">
        {title}
      </h2>
    ) : null}
    <div className="divide-border/60 flex flex-col divide-y">{children}</div>
  </section>
)

/** A labelled row — label (+ optional hint) on the left, value/control on the right. */
export const Row = ({
  label,
  hint,
  className,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  className?: string
  children?: ReactNode
}) => (
  <div className={cn("flex items-center justify-between gap-4 py-3.5", className)}>
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm font-medium">{label}</span>
      {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
    </div>
    {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
  </div>
)
