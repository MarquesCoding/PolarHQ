"use client"

import { type ReactNode, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setSearchQuery, toggleSidebar } from "@store/uiSlice"
import SuiteTitleBarBase from "@workspace/ui/components/suite-title-bar"

interface SuiteTitleBarProps {
  searchPlaceholder: string
  extra?: ReactNode
}

/** Shared app title bar: sidebar toggle, history nav, search, and an optional right-side slot. */
const SuiteTitleBar = ({ searchPlaceholder, extra }: SuiteTitleBarProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const query = useAppSelector((state) => state.ui.searchQuery)
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed)
  const [canBack, setCanBack] = useState(false)
  const [canForward, setCanForward] = useState(false)
  const lastAction = useRef<"back" | "forward" | null>(null)

  useEffect(() => {
    setCanBack(window.history.length > 1)
    if (lastAction.current === "back") setCanForward(true)
    else if (lastAction.current === null) setCanForward(false)
    lastAction.current = null
  }, [pathname])

  return (
    <SuiteTitleBarBase
      searchPlaceholder={searchPlaceholder}
      searchValue={query}
      onSearchChange={(value) => dispatch(setSearchQuery(value))}
      collapsed={collapsed}
      onToggleSidebar={() => dispatch(toggleSidebar())}
      onBack={() => {
        lastAction.current = "back"
        router.back()
      }}
      onForward={() => {
        lastAction.current = "forward"
        router.forward()
      }}
      canBack={canBack}
      canForward={canForward}
      extra={extra}
    />
  )
}

export default SuiteTitleBar
