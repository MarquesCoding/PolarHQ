"use client"

import { type ReactNode, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@lib/authClient"
import { e2eReady, markUnlockPrompted, shouldPromptUnlock } from "@lib/e2e"
import { UploadProvider } from "@lib/uploadManager"
import Spinner from "@components/Spinner/Spinner"
import UploadPanel from "@components/UploadPanel/UploadPanel"
import UnlockDialog from "@pages/Docs/components/UnlockDialog/UnlockDialog"
import FlatSidebar from "./FlatSidebar"
import FlatTopBar from "./FlatTopBar"

/**
 * Prototype "flat" chrome for Photos: a single full-height sidebar (app switcher + search +
 * nav + usage/settings/account) and an edge-to-edge content column — no app rail, no floating
 * panels. Mirrors AppShell's auth/upload/unlock behaviour.
 */
const FlatShell = ({ children }: { children: ReactNode }) => {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [unlockOpen, setUnlockOpen] = useState(false)

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/sign-in")
  }, [isPending, session, router])

  useEffect(() => {
    if (!session?.user) return
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
  }, [session?.user])

  if (isPending || !session?.user) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <Spinner className="size-6" />
      </div>
    )
  }

  return (
    <UploadProvider>
      <div className="bg-background flex h-svh overflow-hidden select-none">
        <FlatSidebar />
        <div className="border-border flex min-w-0 flex-1 flex-col border-l">
          <FlatTopBar />
          <main className="scrollbar-slim min-w-0 flex-1 overflow-y-auto overscroll-none">
            {children}
          </main>
        </div>
      </div>
      <UploadPanel />
      <UnlockDialog
        open={unlockOpen}
        onOpenChange={setUnlockOpen}
        onUnlocked={() => setUnlockOpen(false)}
      />
    </UploadProvider>
  )
}

export default FlatShell
