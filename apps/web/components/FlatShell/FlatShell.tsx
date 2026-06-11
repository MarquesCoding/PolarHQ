"use client"

import { type ReactNode, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { authClient } from "@lib/authClient"
import { e2eReady, markUnlockPrompted, shouldPromptUnlock } from "@lib/e2e"
import { UploadProvider } from "@lib/uploadManager"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setSidebarMobileOpen } from "@store/uiSlice"
import { cn } from "@workspace/ui/lib/utils"
import OnboardingCard from "@components/OnboardingCard/OnboardingCard"
import Spinner from "@components/Spinner/Spinner"
import UploadPanel from "@components/UploadPanel/UploadPanel"
import UnlockDialog from "@pages/Docs/components/UnlockDialog/UnlockDialog"

/** Stationary overlay slot id — content that must not scroll (e.g. the Photos timeline rail)
 *  portals into here; it sits below the top bar and over the scrolling main column. */
export const CONTENT_OVERLAY_ID = "app-content-overlay"

interface FlatShellProps {
  /** The configured `FlatSidebar`. */
  sidebar: ReactNode
  /** The configured `FlatTopBar`. */
  topBar: ReactNode
  children: ReactNode
}

/**
 * Shared "flat" app chrome: a single full-height sidebar and an edge-to-edge content column
 * (top bar + scrolling main + a stationary overlay slot) — no app rail, no floating panels.
 * Handles auth redirect, the encryption-unlock prompt, the upload manager, and iframe-embedded
 * mode (sidebar hidden). Every app shares this; apps differ only in the sidebar/top-bar content.
 */
const FlatShell = ({ sidebar, topBar, children }: FlatShellProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed)
  const mobileOpen = useAppSelector((state) => state.ui.sidebarMobileOpen)
  const { data: session, isPending } = authClient.useSession()
  const [embedded, setEmbedded] = useState(false)
  const [unlockOpen, setUnlockOpen] = useState(false)

  useEffect(() => {
    dispatch(setSidebarMobileOpen(false))
  }, [pathname, dispatch])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dispatch(setSidebarMobileOpen(false))
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [mobileOpen, dispatch])

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

  useEffect(() => {
    if (embedded || !session?.user) return
    let cancelled = false
    void (async () => {
      await e2eReady()
      if (!cancelled && shouldPromptUnlock()) {
        markUnlockPrompted()
        setUnlockOpen(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [embedded, session?.user])

  if (isPending || !session?.user) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <Spinner className="size-6" />
      </div>
    )
  }

  const content = (
    <div className="flex min-h-0 flex-1 flex-col">
      {topBar}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <main className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overscroll-none">
          {children}
        </main>
        <div
          id={CONTENT_OVERLAY_ID}
          className="pointer-events-none absolute inset-0 z-40"
        />
      </div>
    </div>
  )

  if (embedded) {
    return (
      <UploadProvider>
        <div className="bg-background flex h-svh overflow-hidden select-none">{content}</div>
        <UploadPanel />
      </UploadProvider>
    )
  }

  return (
    <UploadProvider>
      <div className="bg-background flex h-svh overflow-hidden select-none">
        {mobileOpen ? (
          <div
            aria-hidden
            onClick={() => dispatch(setSidebarMobileOpen(false))}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
          />
        ) : null}
        <div
          className={cn(
            "fixed inset-y-0 start-0 z-50 transition-transform duration-200 ease-out",
            "md:static md:z-auto md:translate-x-0! md:transition-none",
            mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
            collapsed && "md:hidden",
          )}
        >
          {sidebar}
        </div>
        <div className="border-border flex min-w-0 flex-1 flex-col border-s">{content}</div>
      </div>
      <UploadPanel />
      <OnboardingCard />
      <UnlockDialog
        open={unlockOpen}
        onOpenChange={setUnlockOpen}
        onUnlocked={() => setUnlockOpen(false)}
      />
    </UploadProvider>
  )
}

export default FlatShell
