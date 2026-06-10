"use client"

import { APP_BUILD, APP_VERSION } from "@lib/env"
import { formatBytes } from "@lib/format"
import { fetchUsage } from "@lib/photos"
import { useQuery } from "@tanstack/react-query"
import StorageMeterBase from "@workspace/ui/components/storage-meter"
import Changelog from "@components/Changelog/Changelog"

/** Shared storage-usage footer (Photos + Drive share one storage quota). */
const StorageMeter = ({ collapsed }: { collapsed: boolean }) => {
  const { data: usage } = useQuery({ queryKey: ["photos", "usage"], queryFn: fetchUsage })

  const percent =
    usage?.quotaBytes && usage.quotaBytes > 0
      ? Math.min(100, (usage.usedBytes / usage.quotaBytes) * 100)
      : 0
  const label = usage
    ? `${formatBytes(usage.usedBytes)} of ${usage.quotaBytes ? formatBytes(usage.quotaBytes) : "Unlimited"}`
    : undefined

  return (
    <StorageMeterBase
      collapsed={collapsed}
      percent={percent}
      label={label}
      footer={<Changelog version={APP_VERSION} build={APP_BUILD} />}
    />
  )
}

export default StorageMeter
