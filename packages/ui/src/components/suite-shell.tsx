import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

interface SuiteShellProps {
  sidebar: ReactNode
  titleBar: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Shared suite chrome, edge-to-edge to mirror the desktop app: a full-height flush sidebar and a
 * content column whose frosted title bar floats over a grid that scrolls flush to the top edge.
 */
const SuiteShell = ({ sidebar, titleBar, children, className }: SuiteShellProps) => (
  <div className={cn("bg-background flex overflow-hidden select-none", className)}>
    {sidebar}
    <div className="relative flex min-w-0 flex-1 flex-col">
      <div className="absolute inset-x-0 top-0 z-20">{titleBar}</div>
      <main className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overscroll-none pt-14">
        {children}
      </main>
    </div>
  </div>
)

export default SuiteShell
