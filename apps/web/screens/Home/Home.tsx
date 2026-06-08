"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@lib/authClient"
import { fetchSetupStatus } from "@lib/setup"
import Launcher from "@pages/Launcher/Launcher"
import { useQuery } from "@tanstack/react-query"

const Home = () => {
  const router = useRouter()
  const { data: status, isLoading } = useQuery({
    queryKey: ["setup-status"],
    queryFn: fetchSetupStatus,
  })
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    // Only send to /setup when setup isn't done AND nobody is signed in. A freshly
    // signed-up admin has a session but may still read a stale "not completed"
    // status from cache — don't bounce them back to the setup screen.
    if (status && !status.setupCompleted && !isPending && !session?.user) {
      router.replace("/setup")
      return
    }
    if (status?.setupCompleted && !isPending && !session?.user) {
      router.replace("/sign-in")
    }
  }, [status, session, isPending, router])

  if (isLoading || isPending || !status?.setupCompleted || !session?.user) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </main>
    )
  }

  return <Launcher />
}

export default Home
