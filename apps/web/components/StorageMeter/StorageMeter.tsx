"use client"

import { APP_BUILD, APP_VERSION } from "@lib/env"
import { formatBytes } from "@lib/format"
import { fetchUsage } from "@lib/photos"
import { useQuery } from "@tanstack/react-query"

/** Shared storage-usage footer (Photos + Drive share one storage quota). */
const StorageMeter = ({ collapsed }: { collapsed: boolean }) => {
  const { data: usage } = useQuery({ queryKey: ["photos", "usage"], queryFn: fetchUsage })
  if (collapsed) return null

  const usedPercent =
    usage?.quotaBytes && usage.quotaBytes > 0
      ? Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100)
      : 0

  return (
    <div className="mt-auto flex flex-col gap-1.5 px-1.5 pb-1">
      {usage ? (
        <>
          <div className="bg-sidebar-accent h-1.5 w-full overflow-hidden rounded-full">
            <div className="bg-primary h-full rounded-full" style={{ width: `${usedPercent}%` }} />
          </div>
          <p className="text-muted-foreground text-center text-xs">
            {formatBytes(usage.usedBytes)}
            {usage.quotaBytes ? ` of ${formatBytes(usage.quotaBytes)}` : ""}
          </p>
        </>
      ) : null}
      <p className="text-muted-foreground/60 pt-0.5 text-center font-mono text-[10px] tracking-tight">
        v{APP_VERSION} · build {APP_BUILD}
      </p>
    </div>
  )
}

export default StorageMeter
