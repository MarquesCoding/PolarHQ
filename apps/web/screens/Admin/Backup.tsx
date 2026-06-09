"use client"

import { useEffect, useState } from "react"
import {
  type AdminBackupRun,
  disconnectGdrive,
  fetchBackupRuns,
  fetchBackupSettings,
  formatBytes,
  triggerBackup,
  updateBackupSettings,
} from "@lib/admin"
import { API_URL } from "@lib/env"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@workspace/ui/components/badge"
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
import { Switch } from "@workspace/ui/components/switch"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { toast } from "sonner"

const STATUS_VARIANT: Record<AdminBackupRun["status"], "secondary" | "default" | "destructive"> = {
  running: "secondary",
  completed: "default",
  failed: "destructive",
}

const Backup = () => {
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "backup", "settings"],
    queryFn: fetchBackupSettings,
  })
  const { data: runs } = useQuery({
    queryKey: ["admin", "backup", "runs"],
    queryFn: fetchBackupRuns,
    refetchInterval: (query) =>
      (query.state.data ?? []).some((run) => run.status === "running") ? 3000 : false,
  })

  const [enabled, setEnabled] = useState(false)
  const [provider, setProvider] = useState<"s3" | "gdrive">("s3")
  const [gdriveFolderId, setGdriveFolderId] = useState("")
  const [endpoint, setEndpoint] = useState("")
  const [region, setRegion] = useState("")
  const [bucket, setBucket] = useState("")
  const [prefix, setPrefix] = useState("")
  const [accessKeyId, setAccessKeyId] = useState("")
  const [secretAccessKey, setSecretAccessKey] = useState("")
  const [forcePathStyle, setForcePathStyle] = useState(true)
  const [frequencyHours, setFrequencyHours] = useState("24")

  useEffect(() => {
    if (!settings) return
    setEnabled(settings.enabled)
    setProvider(settings.provider)
    setGdriveFolderId(settings.gdriveFolderId ?? "")
    setEndpoint(settings.endpoint ?? "")
    setRegion(settings.region ?? "")
    setBucket(settings.bucket ?? "")
    setPrefix(settings.prefix ?? "")
    setAccessKeyId(settings.accessKeyId ?? "")
    setForcePathStyle(settings.forcePathStyle)
    setFrequencyHours(String(settings.frequencyHours))
  }, [settings])

  const save = useMutation({
    mutationFn: () =>
      updateBackupSettings({
        enabled,
        provider,
        frequencyHours: Math.max(1, Number(frequencyHours) || 24),
        ...(provider === "s3"
          ? {
              endpoint: endpoint.trim() || null,
              region: region.trim() || null,
              bucket: bucket.trim() || null,
              prefix: prefix.trim() || null,
              accessKeyId: accessKeyId.trim() || null,
              forcePathStyle,
              ...(secretAccessKey ? { secretAccessKey } : {}),
            }
          : { gdriveFolderId: gdriveFolderId.trim() || null }),
      }),
    onSuccess: () => {
      toast.success("Backup settings saved")
      setSecretAccessKey("")
      void queryClient.invalidateQueries({ queryKey: ["admin", "backup", "settings"] })
    },
    onError: () => toast.error("Could not save backup settings"),
  })

  const disconnect = useMutation({
    mutationFn: disconnectGdrive,
    onSuccess: () => {
      toast.success("Google Drive disconnected")
      void queryClient.invalidateQueries({ queryKey: ["admin", "backup", "settings"] })
    },
    onError: () => toast.error("Could not disconnect"),
  })

  const ready = provider === "gdrive" ? settings?.gdriveConnected : Boolean(settings?.bucket)

  const run = useMutation({
    mutationFn: triggerBackup,
    onSuccess: () => {
      toast.success("Backup started")
      void queryClient.invalidateQueries({ queryKey: ["admin", "backup", "runs"] })
    },
    onError: () => toast.error("Could not start the backup"),
  })

  return (
    <AdminPage
      title="Backup"
      description="Scheduled off-site backups of all stored objects to an S3 bucket or Google Drive."
      action={
        <Button variant="secondary" disabled={!ready || run.isPending} onClick={() => run.mutate()}>
          Run backup now
        </Button>
      }
    >
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="flex max-w-2xl flex-col gap-6">
          <div className="panel flex flex-col gap-5 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">Scheduled backups</span>
                <span className="text-muted-foreground text-xs">
                  Run automatically every {frequencyHours || "24"} hours.
                </span>
              </div>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bk-provider">Destination</Label>
              <Select
                value={provider}
                onValueChange={(value) => setProvider(value as "s3" | "gdrive")}
              >
                <SelectTrigger id="bk-provider" className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="s3">S3-compatible bucket</SelectItem>
                  <SelectItem value="gdrive">Google Drive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {provider === "s3" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bk-bucket">Bucket</Label>
                    <Input
                      id="bk-bucket"
                      value={bucket}
                      onChange={(event) => setBucket(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bk-region">Region</Label>
                    <Input
                      id="bk-region"
                      value={region}
                      placeholder="us-east-1"
                      onChange={(event) => setRegion(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bk-endpoint">Endpoint</Label>
                    <Input
                      id="bk-endpoint"
                      value={endpoint}
                      placeholder="https://s3.amazonaws.com"
                      onChange={(event) => setEndpoint(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bk-prefix">Prefix</Label>
                    <Input
                      id="bk-prefix"
                      value={prefix}
                      placeholder="orbit-backup/"
                      onChange={(event) => setPrefix(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bk-access">Access key ID</Label>
                    <Input
                      id="bk-access"
                      value={accessKeyId}
                      onChange={(event) => setAccessKeyId(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="bk-secret">Secret access key</Label>
                    <Input
                      id="bk-secret"
                      type="password"
                      value={secretAccessKey}
                      placeholder={settings?.hasSecretKey ? "•••••••• (unchanged)" : ""}
                      onChange={(event) => setSecretAccessKey(event.target.value)}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="bk-pathstyle" className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-medium">Force path-style URLs</span>
                    <span className="text-muted-foreground text-xs font-normal">
                      Required for MinIO and most self-hosted S3.
                    </span>
                  </Label>
                  <Switch
                    id="bk-pathstyle"
                    checked={forcePathStyle}
                    onCheckedChange={setForcePathStyle}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">Google Drive connection</span>
                    <span className="text-muted-foreground text-xs">
                      {settings?.gdriveConnected
                        ? "Connected — backups upload to your Drive."
                        : "Authorize PolarHQ to upload backups to your Google Drive."}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {settings?.gdriveConnected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={disconnect.isPending}
                        onClick={() => disconnect.mutate()}
                      >
                        Disconnect
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => {
                        window.location.href = `${API_URL}/api/v1/admin/backup/gdrive/auth`
                      }}
                    >
                      {settings?.gdriveConnected ? "Reconnect" : "Connect Google Drive"}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="bk-folder">Target folder ID (optional)</Label>
                  <Input
                    id="bk-folder"
                    value={gdriveFolderId}
                    placeholder="Drive folder ID, or blank for My Drive"
                    onChange={(event) => setGdriveFolderId(event.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bk-frequency">Frequency (hours)</Label>
              <Input
                id="bk-frequency"
                type="number"
                min={1}
                value={frequencyHours}
                onChange={(event) => setFrequencyHours(event.target.value)}
                className="w-40"
              />
            </div>

            <div>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                Save settings
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Recent runs</h2>
            {runs && runs.length > 0 ? (
              <div className="panel divide-border/60 divide-y overflow-hidden rounded-xl">
                {runs.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Badge variant={STATUS_VARIANT[entry.status]}>{entry.status}</Badge>
                    <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                      {entry.status === "failed" && entry.error
                        ? entry.error
                        : `${entry.objectCount} objects · ${formatBytes(entry.bytes)} · ${entry.trigger}`}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                      {new Date(entry.startedAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No backups have run yet.</p>
            )}
          </div>
        </div>
      )}
    </AdminPage>
  )
}

export default Backup
