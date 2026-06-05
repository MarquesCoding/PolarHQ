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
    if (status && !status.setupCompleted) {
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
