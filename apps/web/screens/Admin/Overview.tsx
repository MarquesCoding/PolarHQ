"use client"

import { fetchOverview, formatBytes } from "@lib/admin"
import { Icon } from "@lib/icons"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent } from "@workspace/ui/components/card"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"

interface Stat {
  label: string
  value: string
  icon: string
}

const Overview = () => {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "overview"], queryFn: fetchOverview })

  const stats: Stat[] = data
    ? [
        { label: "Users", value: String(data.users), icon: "users" },
        { label: "Banned", value: String(data.bannedUsers), icon: "ban" },
        { label: "Groups", value: String(data.groups), icon: "users-group" },
        { label: "Roles", value: String(data.roles), icon: "user-shield" },
        { label: "Storage used", value: formatBytes(data.storageBytes), icon: "gauge" },
        { label: "Apps live", value: String(data.appsAvailable), icon: "apps" },
      ]
    : []

  return (
    <AdminPage title="Overview" description="At-a-glance health of this instance.">
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 py-5">
                <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <Icon name={stat.icon} className="size-5" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-2xl font-semibold tabular-nums">{stat.value}</span>
                  <span className="text-muted-foreground text-xs">{stat.label}</span>
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminPage>
  )
}

export default Overview
