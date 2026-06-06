"use client"

import { useEffect, useState } from "react"
import { type AdminSettings, fetchAdminSettings, updateAdminSettings } from "@lib/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { toast } from "sonner"

const MODES: { value: AdminSettings["registrationMode"]; label: string }[] = [
  { value: "invite_only", label: "Invite only" },
  { value: "open", label: "Open — anyone can sign up" },
  { value: "closed", label: "Closed — no new accounts" },
]

const Settings = () => {
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
      toast.success("Settings saved")
      void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] })
    },
    onError: () => toast.error("Could not save settings"),
  })

  return (
    <AdminPage title="Settings" description="Registration and instance-wide policy.">
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="flex max-w-xl flex-col gap-6">
          <div className="panel flex flex-col gap-5 rounded-xl p-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-mode">Who can create accounts?</Label>
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
              <Label htmlFor="domains">Allowed email domains</Label>
              <Input
                id="domains"
                value={domains}
                placeholder="example.com, team.org"
                onChange={(event) => setDomains(event.target.value)}
              />
              <span className="text-muted-foreground text-xs">
                Comma-separated. Leave blank to allow any domain.
              </span>
            </div>
            <div>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                Save changes
              </Button>
            </div>
          </div>

          <div className="panel flex flex-col gap-2 rounded-xl p-5 opacity-70">
            <span className="text-sm font-medium">Automatic S3 backup</span>
            <span className="text-muted-foreground text-xs">
              Scheduled off-site backups to an S3-compatible bucket. Coming soon.
            </span>
          </div>
        </div>
      )}
    </AdminPage>
  )
}

export default Settings
