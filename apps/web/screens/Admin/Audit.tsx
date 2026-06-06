"use client"

import { fetchAdminAudit } from "@lib/admin"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@workspace/ui/components/badge"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"

const Audit = () => {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: fetchAdminAudit,
  })

  return (
    <AdminPage title="Audit log" description="A record of every administrative change.">
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
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
      )}
    </AdminPage>
  )
}

export default Audit
