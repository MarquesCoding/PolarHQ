"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { type AdminSettings, fetchAdminSettings, updateAdminSettings } from "@lib/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@polarhq/ui/components/button"
import { Input } from "@polarhq/ui/components/input"
import { Label } from "@polarhq/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polarhq/ui/components/select"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const Settings = () => {
  const { t } = useTranslation("admin")
  const MODES: { value: AdminSettings["registrationMode"]; label: string }[] = [
    { value: "invite_only", label: t("settings.modeInviteOnly") },
    { value: "open", label: t("settings.modeOpen") },
    { value: "closed", label: t("settings.modeClosed") },
  ]
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: fetchAdminSettings,
  })

  const [mode, setMode] = useState<AdminSettings["registrationMode"]>("invite_only")
  const [domains, setDomains] = useState("")

  useEffect(() => {
    if (!settings) return
    setMode(settings.registrationMode)
    setDomains((settings.allowedEmailDomains ?? []).join(", "))
  }, [settings])

  const save = useMutation({
    mutationFn: () => {
      const list = domains
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
      return updateAdminSettings({
        registrationMode: mode,
        allowedEmailDomains: list.length > 0 ? list : null,
      })
    },
    onSuccess: () => {
      toast.success(t("settings.saved"))
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] })
    },
    onError: () => toast.error(t("settings.saveError")),
  })

  return (
    <AdminPage title={t("settings.title")} description={t("settings.description")}>
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="flex max-w-xl flex-col gap-6">
          <div className="panel flex flex-col gap-5 rounded-xl p-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-mode">{t("settings.whoCanCreate")}</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
                <SelectTrigger id="reg-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="domains">{t("settings.allowedDomains")}</Label>
              <Input
                id="domains"
                value={domains}
                placeholder={t("settings.domainsPlaceholder")}
                onChange={(event) => setDomains(event.target.value)}
              />
              <span className="text-muted-foreground text-xs">
                {t("settings.domainsHint")}
              </span>
            </div>
            <div>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {t("settings.saveChanges")}
              </Button>
            </div>
          </div>

          <div className="panel flex items-center justify-between gap-3 rounded-xl p-5">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{t("settings.s3Backup")}</span>
              <span className="text-muted-foreground text-xs">
                {t("settings.s3BackupHint")}
              </span>
            </div>
            <Button variant="secondary" render={<Link href="/admin/backup">{t("settings.configure")}</Link>} />
          </div>
        </div>
      )}
    </AdminPage>
  )
}

export default Settings
