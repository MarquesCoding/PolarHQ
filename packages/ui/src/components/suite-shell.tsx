import type { ReactNode } from "react"
import { cn } from "@polarhq/ui/lib/utils"

interface SuiteShellProps {
  rail?: ReactNode
  sidebar: ReactNode
  titleBar: ReactNode
  children: ReactNode
  className?: string
}

/** Shared suite chrome layout: action rail, sidebar, title bar, and a scrolling content panel. */
const SuiteShell = ({ rail, sidebar, titleBar, children, className }: SuiteShellProps) => (
  <div className={cn("bg-background flex gap-2 overflow-hidden p-2 select-none", className)}>
    {rail}
    <div className="flex min-w-0 flex-1 gap-2">
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
        {titleBar}
        <main className="panel scrollbar-slim min-w-0 flex-1 overflow-y-auto overscroll-none rounded-xl">
          {children}
        </main>
      </div>
    </div>
  </div>
)

export default SuiteShell
