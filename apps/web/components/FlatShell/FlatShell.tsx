import { type ReactNode, useEffect, useState } from "react"
import { usePathname, useNavigation } from "@workspace/screens/platform"
import { authClient } from "@workspace/core/authClient"
import { e2eReady, markUnlockPrompted, shouldPromptUnlock } from "@workspace/core/e2e"
import { SidebarProvider, useSidebar } from "@workspace/ui/components/sidebar"
import OnboardingCard from "@components/OnboardingCard/OnboardingCard"
import Spinner from "@components/Spinner/Spinner"
import UnlockDialog from "@pages/Docs/components/UnlockDialog/UnlockDialog"

/** Stationary overlay slot id — content that must not scroll (e.g. the Photos timeline rail)
 *  portals into here; it sits below the top bar and over the scrolling main column. */
export const CONTENT_OVERLAY_ID = "app-content-overlay"

/** Closes the mobile sidebar drawer whenever the route changes (shadcn keeps it open otherwise). */
const CloseSidebarOnNavigate = () => {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()
  useEffect(() => {
    setOpenMobile(false)
  }, [pathname, setOpenMobile])
  return null
}

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
  const router = useNavigation()
  const { data: session, isPending } = authClient.useSession()
  const [embedded, setEmbedded] = useState(false)
  const [unlockOpen, setUnlockOpen] = useState(false)

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
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="absolute inset-x-0 top-0 z-30">{topBar}</div>
      <main className="scrollbar-slim min-h-0 flex-1 overflow-y-auto overscroll-none pt-14">
        {children}
      </main>
      <div id={CONTENT_OVERLAY_ID} className="pointer-events-none absolute inset-0 z-40" />
    </div>
  )

  if (embedded) {
    return (
      <SidebarProvider className="bg-background h-svh overflow-hidden select-none">
        {content}
      </SidebarProvider>
    )
  }

  return (
    <>
      <SidebarProvider className="bg-background h-svh overflow-hidden select-none">
        <CloseSidebarOnNavigate />
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">{content}</div>
      </SidebarProvider>
      <OnboardingCard />
      <UnlockDialog
        open={unlockOpen}
        onOpenChange={setUnlockOpen}
        onUnlocked={() => setUnlockOpen(false)}
      />
    </>
  )
}

export default FlatShell
