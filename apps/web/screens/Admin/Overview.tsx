"use client"

import { fetchOverview, formatBytes } from "@lib/admin"
import { Icon } from "@lib/icons"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Card, CardContent } from "@polarhq/ui/components/card"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"

interface Stat {
  label: string
  value: string
  icon: string
}

const Overview = () => {
  const { t } = useTranslation("admin")
  const { data, isLoading } = useQuery({ queryKey: ["admin", "overview"], queryFn: fetchOverview })

  const stats: Stat[] = data
    ? [
        { label: t("overview.users"), value: String(data.users), icon: "users" },
        { label: t("overview.banned"), value: String(data.bannedUsers), icon: "ban" },
        { label: t("overview.groups"), value: String(data.groups), icon: "users-group" },
        { label: t("overview.roles"), value: String(data.roles), icon: "user-shield" },
        { label: t("overview.storageUsed"), value: formatBytes(data.storageBytes), icon: "gauge" },
        { label: t("overview.appsLive"), value: String(data.appsAvailable), icon: "apps" },
      ]
    : []

  return (
    <AdminPage title={t("overview.title")} description={t("overview.description")}>
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
