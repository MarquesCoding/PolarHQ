import { fetchAdminApps, setAppEnabled } from "@lib/admin"
import { Icon } from "@lib/icons"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@workspace/ui/components/badge"
import { Switch } from "@workspace/ui/components/switch"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const Apps = () => {
  const { t } = useTranslation("admin")
  const queryClient = useQueryClient()
  const { data: apps, isLoading } = useQuery({
    queryKey: ["admin", "apps"],
    queryFn: fetchAdminApps,
  })

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setAppEnabled(id, enabled),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "apps"] })
      void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] })
    },
    onError: () => toast.error(t("apps.updateError")),
  })

  return (
    <AdminPage
      title={t("apps.title")}
      description={t("apps.description")}
    >
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="panel divide-border/60 divide-y overflow-hidden rounded-xl">
          {(apps ?? []).map((app) => (
            <div key={app.id} className="flex items-center gap-3 px-3 py-3">
              <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Icon name={app.icon} className="size-5" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-sm font-medium">
                  {app.name}
                  {app.status === "coming_soon" ? (
                    <Badge variant="secondary">{t("apps.comingSoon")}</Badge>
                  ) : null}
                </span>
                <span className="text-muted-foreground truncate text-xs">{app.description}</span>
              </div>
              <Switch
                checked={app.enabled}
                disabled={app.status === "coming_soon" || toggle.isPending}
                onCheckedChange={(enabled) => toggle.mutate({ id: app.id, enabled })}
              />
            </div>
          ))}
        </div>
      )}
    </AdminPage>
  )
}

export default Apps
