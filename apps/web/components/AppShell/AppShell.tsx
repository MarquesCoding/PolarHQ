"use client"

import { type ReactNode, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { authClient } from "@lib/authClient"
import { UploadProvider } from "@lib/uploadManager"
import GlobalActionBar from "@components/GlobalActionBar/GlobalActionBar"
import Spinner from "@components/Spinner/Spinner"
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
  const { data: session, isPending } = authClient.useSession()

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

  return (
    <UploadProvider>
      <div className="bg-background flex h-svh gap-2 overflow-hidden p-2 select-none">
        <GlobalActionBar />
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
      </div>
      <UploadPanel />
    </UploadProvider>
  )
}

export default AppShell
