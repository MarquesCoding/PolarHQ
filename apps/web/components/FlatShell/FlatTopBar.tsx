"use client"

import { type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { Icon } from "@lib/icons"

export interface TopBarTitle {
  /** Returns true when this entry should be shown for the given pathname. */
  match: (pathname: string) => boolean
  label: string
  icon: string
}

interface FlatTopBarProps {
  /** Ordered title entries; the first match (falling back to the first entry) is shown. */
  titles: TopBarTitle[]
  /** Optional right-aligned controls (toolbars, size controls, create buttons…). */
  extra?: ReactNode
}

/** Shared flat top bar: a route-aware icon + title on the left, app controls on the right. */
const FlatTopBar = ({ titles, extra }: FlatTopBarProps) => {
  const pathname = usePathname()
  const current = titles.find((entry) => entry.match(pathname)) ?? titles[0]

  return (
    <header className="border-border bg-sidebar flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
      {current ? (
        <>
          <Icon name={current.icon} className="text-muted-foreground size-[18px]" />
          <span className="text-sm font-medium">{current.label}</span>
        </>
      ) : null}
      {extra ? <div className="ml-auto">{extra}</div> : null}
    </header>
  )
}

export default FlatTopBar
