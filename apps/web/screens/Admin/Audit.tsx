"use client"

import { dateLocale } from "@lib/i18n/format"
import { fetchAdminAudit } from "@lib/admin"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Badge } from "@polarhq/ui/components/badge"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"

const Audit = () => {
  const { t } = useTranslation("admin")
  const { data: entries, isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: fetchAdminAudit,
  })

  return (
    <AdminPage title={t("audit.title")} description={t("audit.description")}>
      {isLoading ? (
        <PageSpinner />
      ) : entries && entries.length > 0 ? (
        <div className="panel divide-border/60 divide-y overflow-hidden rounded-xl">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
              <Badge variant="outline" className="font-mono">
                {entry.action}
              </Badge>
              <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                {entry.targetType ? `${entry.targetType} ${entry.targetId ?? ""}` : ""}
              </span>
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {new Date(entry.createdAt).toLocaleString(dateLocale())}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t("audit.empty")}</p>
      )}
    </AdminPage>
  )
}

export default Audit
