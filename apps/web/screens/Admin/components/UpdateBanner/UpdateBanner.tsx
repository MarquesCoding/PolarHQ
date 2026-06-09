"use client"

import { useEffect, useState } from "react"
import { IconArrowUpCircle, IconX } from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { fetchUpdateCheck } from "@lib/admin"
import { Button } from "@workspace/ui/components/button"

const DISMISS_KEY = "polarhq.dismissedUpdate"

/** Admin-only banner shown when a newer release is available. Dismissible per version. */
const UpdateBanner = () => {
  const { data } = useQuery({
    queryKey: ["admin", "update-check"],
    queryFn: fetchUpdateCheck,
    retry: false,
    staleTime: 6 * 60 * 60 * 1000,
  })
  const [dismissed, setDismissed] = useState<string | null>(null)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY))
  }, [])

  if (!data?.updateAvailable || dismissed === data.latest) return null

  return (
    <div className="mb-5 flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm">
      <IconArrowUpCircle className="size-5 shrink-0 text-blue-400" />
      <div className="min-w-0 flex-1">
        <span className="font-medium">PolarHQ {data.latest} is available.</span>{" "}
        <span className="text-muted-foreground">This instance is running {data.current}.</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={() => window.open(data.url, "_blank", "noopener,noreferrer")}
      >
        Release notes
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, data.latest)
          setDismissed(data.latest)
        }}
      >
        <IconX className="size-4" />
      </Button>
    </div>
  )
}

export default UpdateBanner
