import { useEffect, useState } from "react"
import { fetchAdminSettings, updateAdminSettings } from "@lib/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const Branding = () => {
  const { t } = useTranslation("admin")
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: fetchAdminSettings,
  })

  const [name, setName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [accent, setAccent] = useState("")

  useEffect(() => {
    if (!settings) return
    setName(settings.instanceName ?? "")
    setLogoUrl(settings.logoUrl ?? "")
    setAccent(settings.accentColor ?? "")
  }, [settings])

  const save = useMutation({
    mutationFn: () =>
      updateAdminSettings({
        instanceName: name.trim() || null,
        logoUrl: logoUrl.trim() || null,
        accentColor: accent.trim() || null,
      }),
    onSuccess: () => {
      toast.success(t("branding.saved"))
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] })
    },
    onError: () => toast.error(t("branding.saveError")),
  })

  return (
    <AdminPage title={t("branding.title")} description={t("branding.description")}>
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="panel flex max-w-xl flex-col gap-5 rounded-xl p-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instance-name">{t("branding.instanceName")}</Label>
            <Input
              id="instance-name"
              value={name}
              placeholder="PolarHQ"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="logo-url">{t("branding.logoUrl")}</Label>
            <Input
              id="logo-url"
              value={logoUrl}
              placeholder="https://…/logo.svg"
              onChange={(event) => setLogoUrl(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accent">{t("branding.accentColour")}</Label>
            <div className="flex items-center gap-3">
              <Input
                id="accent"
                value={accent}
                placeholder="#5b8def"
                onChange={(event) => setAccent(event.target.value)}
                className="w-40"
              />
              <span
                className="border-border size-8 shrink-0 rounded-md border"
                style={{ backgroundColor: accent || "transparent" }}
              />
            </div>
          </div>
          <div>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {t("branding.saveChanges")}
            </Button>
          </div>
        </div>
      )}
    </AdminPage>
  )
}

export default Branding
