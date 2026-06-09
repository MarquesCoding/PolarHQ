import type { ReactNode } from "react"
import { IconLock } from "@tabler/icons-react"

interface BrowserFrameProps {
  url: string
  children: ReactNode
  className?: string
}

/** Wraps content in a macOS-style browser window (traffic lights + URL bar). */
const BrowserFrame = ({ url, children, className = "" }: BrowserFrameProps) => (
  <div
    className={`overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1e] shadow-2xl shadow-black/60 ${className}`}
  >
    <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#2a2a2c] px-3 py-1.5">
      {/* Traffic lights */}
      <div className="flex shrink-0 gap-1.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
      </div>

      {/* URL bar */}
      <div className="mx-auto flex w-full max-w-xs items-center justify-center gap-1.5 rounded bg-black/30 px-2.5 py-0.5 text-[11px] text-white/55">
        <IconLock className="size-2.5 shrink-0" />
        <span className="truncate">{url}</span>
      </div>

      {/* Spacer to keep the URL bar centered against the traffic lights */}
      <div aria-hidden className="w-[42px] shrink-0" />
    </div>

    {children}
  </div>
)

export default BrowserFrame
