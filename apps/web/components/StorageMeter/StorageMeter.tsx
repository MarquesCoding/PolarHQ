"use client"

import { APP_BUILD, APP_VERSION } from "@lib/env"
import { formatBytes } from "@lib/format"
import { fetchUsage } from "@lib/photos"
import { useQuery } from "@tanstack/react-query"
import StorageMeterBase from "@workspace/ui/components/storage-meter"

/** Shared storage-usage footer (Photos + Drive share one storage quota). */
const StorageMeter = ({ collapsed }: { collapsed: boolean }) => {
  const { data: usage } = useQuery({ queryKey: ["photos", "usage"], queryFn: fetchUsage })

  const percent =
    usage?.quotaBytes && usage.quotaBytes > 0
      ? Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100)
      : 0
  const label = usage
    ? `${formatBytes(usage.usedBytes)}${usage.quotaBytes ? ` of ${formatBytes(usage.quotaBytes)}` : ""}`
    : undefined

  return (
    <StorageMeterBase
      collapsed={collapsed}
      percent={percent}
      label={label}
      footer={`v${APP_VERSION} · build ${APP_BUILD}`}
    />
  )
}

export default StorageMeter
