"use client"

import { type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { authClient } from "@lib/authClient"
import { SPLIT_APP_MIME, readSplitApp } from "@lib/splitView"
import { UploadProvider } from "@lib/uploadManager"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setSplitApp, setSplitRatio } from "@store/uiSlice"
import GlobalActionBar from "@components/GlobalActionBar/GlobalActionBar"
import Spinner from "@components/Spinner/Spinner"
import SplitPane from "@components/SplitPane/SplitPane"
import UploadPanel from "@components/UploadPanel/UploadPanel"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"

const scrollClasses = "overflow-y-auto scrollbar-slim"

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

  const [embedded, setEmbedded] = useState(false)
  const [dropActive, setDropActive] = useState(false)
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

  const appPanes = (
    <>
      {sidebar}
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
    </>
  )

  // Inside an iframe pane: drop the rail + split machinery, render just the app.
  if (embedded) {
    return (
      <UploadProvider>
        <div className="bg-background flex h-svh gap-2 overflow-hidden p-2 select-none">
          {appPanes}
        </div>
        <UploadPanel />
      </UploadProvider>
    )
  }

  const onResizeMove = (event: PointerEvent) => {
    if (!resizing.current || !rowRef.current) return
    const rect = rowRef.current.getBoundingClientRect()
    dispatch(setSplitRatio((event.clientX - rect.left) / rect.width))
  }
  const stopResize = (event: PointerEvent) => {
    resizing.current = false
    event.currentTarget.releasePointerCapture?.(event.pointerId)
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
            setDropActive(true)
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDropActive(false)
            }
          }}
          onDrop={(event) => {
            const app = readSplitApp(event.dataTransfer)
            setDropActive(false)
            if (!app) return
            event.preventDefault()
            dispatch(setSplitApp(app))
          }}
        >
          <div
            className="flex min-w-0 gap-2"
            style={{ flex: splitApp ? `1 1 ${splitRatio * 100}%` : "1 1 100%" }}
          >
            {appPanes}
          </div>

          {splitApp ? (
            <>
              <div
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
              <div
                className="flex min-w-0"
                style={{ flex: `1 1 ${(1 - splitRatio) * 100}%` }}
              >
                <SplitPane
                  app={splitApp}
                  inert={dropActive}
                  onClose={() => dispatch(setSplitApp(null))}
                />
              </div>
            </>
          ) : null}

          {dropActive ? (
            <div className="border-primary/60 bg-primary/10 pointer-events-none absolute inset-y-0 right-0 z-30 flex w-1/3 items-center justify-center rounded-xl border-2 border-dashed">
              <span className="text-primary text-sm font-medium">Open beside</span>
            </div>
          ) : null}
        </div>
      </div>
      <UploadPanel />
    </UploadProvider>
  )
}

export default AppShell
