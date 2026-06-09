"use client"

import { type ReactNode, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { authClient } from "@lib/authClient"
import { e2eReady, markUnlockPrompted, shouldPromptUnlock } from "@lib/e2e"
import { UploadProvider } from "@lib/uploadManager"
import GlobalActionBar from "@components/GlobalActionBar/GlobalActionBar"
import Spinner from "@components/Spinner/Spinner"
import UploadPanel from "@components/UploadPanel/UploadPanel"
import UnlockDialog from "@pages/Docs/components/UnlockDialog/UnlockDialog"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"

const scrollClasses = "overflow-y-auto overscroll-none scrollbar-slim"

interface AppShellProps {
  sidebar: ReactNode
  titleBar: ReactNode
  children: ReactNode
}

/** Shared suite chrome: action rail, sidebar slot, title-bar slot, upload manager + panel. */
const AppShell = ({ sidebar, titleBar, children }: AppShellProps) => {
  const router = useRouter()
  const pathname = usePathname()
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

  // Logged in but keys not loaded (e.g. an older session): prompt to set up / unlock
  // encryption once, so documents are actually encrypted by default.
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

  return (
    <UploadProvider>
      <div className="bg-background flex h-svh gap-2 overflow-hidden p-2 select-none">
        <GlobalActionBar />
        <div className="relative flex min-w-0 flex-1 gap-2">
          {sidebar}
          {contentColumn}
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

export default AppShell
