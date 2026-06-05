"use client"

import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { authClient } from "@lib/authClient"
import { SPLIT_APP_MIME, readSplitApp } from "@lib/splitView"
import { UploadProvider } from "@lib/uploadManager"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setSplitApp, setSplitRatio, setSplitSide } from "@store/uiSlice"
import GlobalActionBar from "@components/GlobalActionBar/GlobalActionBar"
import Spinner from "@components/Spinner/Spinner"
import SplitPane from "@components/SplitPane/SplitPane"
import UploadPanel from "@components/UploadPanel/UploadPanel"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"

const scrollClasses = "overflow-y-auto scrollbar-slim"
const PREVIEW_PRIMARY = 0.6

type Side = "left" | "right"

interface AppShellProps {
  sidebar: ReactNode
  titleBar: ReactNode
  children: ReactNode
}

/** Shared suite chrome: action rail, sidebar slot, title-bar slot, upload manager + panel. */
const AppShell = ({ sidebar, titleBar, children }: AppShellProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const { data: session, isPending } = authClient.useSession()
  const splitApp = useAppSelector((state) => state.ui.splitApp)
  const splitRatio = useAppSelector((state) => state.ui.splitRatio)
  const splitSide = useAppSelector((state) => state.ui.splitSide)

  const [embedded, setEmbedded] = useState(false)
  const [dragSide, setDragSide] = useState<Side | null>(null)
  const rowRef = useRef<HTMLDivElement>(null)
  const resizing = useRef(false)

  useEffect(() => {
    try {
      setEmbedded(window.self !== window.top)
    } catch {
      setEmbedded(true)
    }
  }, [])

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/sign-in")
  }, [isPending, session, router])

  if (isPending || !session?.user) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <Spinner className="size-6" />
      </div>
    )
  }

  const contentColumn = (
    <div className="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
      {titleBar}
      <main className={cn("panel min-w-0 flex-1 rounded-xl", scrollClasses)}>
        <motion.div
          key={pathname}
          className="flex min-h-full flex-col"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  )

  const appPanes = (
    <>
      {sidebar}
      {contentColumn}
    </>
  )

  // Inside an iframe pane: drop the rail, sidebar, split machinery and the outer padding —
  // the split view shows a single sidebar (the primary app's), not one per pane.
  if (embedded) {
    return (
      <UploadProvider>
        <div className="bg-background flex h-svh gap-2 overflow-hidden select-none">
          {contentColumn}
        </div>
        <UploadPanel />
      </UploadProvider>
    )
  }

  const onResizeMove = (event: PointerEvent) => {
    if (!resizing.current || !rowRef.current) return
    const rect = rowRef.current.getBoundingClientRect()
    const raw = (event.clientX - rect.left) / rect.width
    dispatch(setSplitRatio(splitSide === "left" ? 1 - raw : raw))
  }
  const stopResize = (event: PointerEvent) => {
    resizing.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const previewing = dragSide !== null && !splitApp
  const primaryPct = (previewing ? PREVIEW_PRIMARY : splitApp ? splitRatio : 1) * 100
  const secondaryPct = 100 - primaryPct

  const primaryEl = (
    <div
      key="primary"
      className="flex min-w-0 gap-2 transition-[flex-basis] duration-150"
      style={{ flex: `1 1 ${primaryPct}%` }}
    >
      {appPanes}
    </div>
  )

  let panes: ReactNode[]
  if (previewing) {
    const placeholder = (
      <div
        key="placeholder"
        className="border-primary/60 bg-primary/10 flex min-w-0 items-center justify-center rounded-xl border-2 border-dashed transition-[flex-basis] duration-150"
        style={{ flex: `1 1 ${secondaryPct}%` }}
      >
        <span className="text-primary text-sm font-medium">Open here</span>
      </div>
    )
    panes = dragSide === "left" ? [placeholder, primaryEl] : [primaryEl, placeholder]
  } else if (splitApp) {
    const divider = (
      <div
        key="divider"
        role="separator"
        aria-orientation="vertical"
        onPointerDown={(event) => {
          resizing.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={onResizeMove}
        onPointerUp={stopResize}
        className="group flex w-1.5 shrink-0 cursor-col-resize items-center justify-center"
      >
        <div className="bg-border group-hover:bg-primary h-10 w-1 rounded-full transition-colors" />
      </div>
    )
    const secondaryEl = (
      <div key="secondary" className="flex min-w-0" style={{ flex: `1 1 ${secondaryPct}%` }}>
        <SplitPane
          app={splitApp}
          inert={dragSide !== null}
          onClose={() => dispatch(setSplitApp(null))}
        />
      </div>
    )
    panes =
      splitSide === "left" ? [secondaryEl, divider, primaryEl] : [primaryEl, divider, secondaryEl]
  } else {
    panes = [primaryEl]
  }

  return (
    <UploadProvider>
      <div className="bg-background flex h-svh gap-2 overflow-hidden p-2 select-none">
        <GlobalActionBar />
        <div
          ref={rowRef}
          className="relative flex min-w-0 flex-1 gap-2"
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes(SPLIT_APP_MIME)) return
            event.preventDefault()
            event.dataTransfer.dropEffect = "copy"
            const rect = rowRef.current?.getBoundingClientRect()
            if (rect) setDragSide(event.clientX - rect.left < rect.width / 2 ? "left" : "right")
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragSide(null)
          }}
          onDrop={(event) => {
            const app = readSplitApp(event.dataTransfer)
            const side = dragSide ?? "right"
            setDragSide(null)
            if (!app) return
            event.preventDefault()
            dispatch(setSplitSide(side))
            dispatch(setSplitApp(app))
          }}
        >
          {panes}

          {dragSide && splitApp ? (
            <div
              className={cn(
                "border-primary/60 bg-primary/10 pointer-events-none absolute inset-y-0 z-30 w-1/2 rounded-xl border-2 border-dashed",
                dragSide === "left" ? "left-0" : "right-0",
              )}
            />
          ) : null}
        </div>
      </div>
      <UploadPanel />
    </UploadProvider>
  )
}

export default AppShell
