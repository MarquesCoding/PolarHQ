import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  type GoogleStatus,
  type MigrateProgress,
  googleConnectUrl,
  googleDisconnect,
  googleStatus,
  importGoogleDrive,
  importGooglePhotos,
  waitForGoogleConnected,
} from "@workspace/core/migrate"
import { getHost } from "@workspace/core/host"
import { Button } from "@workspace/ui/components/button"
import { Icon } from "@workspace/screens/icons"
import Spinner from "@components/Spinner/Spinner"
import { toast } from "sonner"

type Kind = "photos" | "drive"

/** Account section: link a Google account and import Photos/Drive (E2E — see @workspace/core/migrate). */
const MigrateGoogle = () => {
  const { t } = useTranslation("account")
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [busy, setBusy] = useState<Kind | null>(null)
  const [progress, setProgress] = useState<MigrateProgress | null>(null)
  const [pickerUrl, setPickerUrl] = useState<string | null>(null)
  const [connectUrl, setConnectUrl] = useState<string | null>(null)
  const cancel = useRef<AbortController | null>(null)

  const openExternal = (url: string) => {
    const host = getHost()
    if (host.isDesktop && host.openExternal) void host.openExternal(url)
    else window.open(url, "_blank", "noopener,noreferrer")
  }

  const refresh = () => {
    void googleStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false, email: null, configured: false }))
  }

  useEffect(() => {
    refresh()
    return () => cancel.current?.abort()
  }, [])

  const connect = async () => {
    const host = getHost()
    let url: string
    try {
      ;({ url } = await googleConnectUrl(host.isDesktop ? "desktop" : undefined))
    } catch {
      toast.error(t("importError"))
      return
    }
    // Web navigates to Google directly; desktop must use the system browser (Google blocks its consent
    // flow inside webviews), then poll until the server-side callback links the account.
    if (!host.isDesktop) {
      window.location.href = url
      return
    }
    setConnectUrl(url)
    openExternal(url)
    const controller = new AbortController()
    cancel.current = controller
    try {
      const ok = await waitForGoogleConnected(controller.signal)
      if (ok) {
        refresh()
        toast.success(t("importConnected"))
      }
    } finally {
      setConnectUrl(null)
      cancel.current = null
    }
  }

  const disconnect = async () => {
    await googleDisconnect().catch(() => undefined)
    refresh()
  }

  const run = async (kind: Kind) => {
    setBusy(kind)
    setProgress({ total: 0, done: 0, failed: 0, current: null })
    setPickerUrl(null)
    const controller = new AbortController()
    cancel.current = controller
    let last: MigrateProgress = { total: 0, done: 0, failed: 0, current: null }
    const onProgress = (p: MigrateProgress) => {
      last = p
      setProgress(p)
    }
    try {
      if (kind === "photos") {
        await importGooglePhotos(
          {
            onPickerUrl: (url) => {
              setPickerUrl(url)
              openExternal(url)
            },
            onPicked: () => setPickerUrl(null),
            onProgress,
          },
          controller.signal,
        )
      } else {
        await importGoogleDrive(onProgress, controller.signal)
      }
      if (!controller.signal.aborted) {
        toast.success(t("importDone", { done: last.done, failed: last.failed }))
      }
    } catch {
      if (!controller.signal.aborted) toast.error(t("importError"))
    } finally {
      setBusy(null)
      setProgress(null)
      setPickerUrl(null)
      cancel.current = null
    }
  }

  if (!status) {
    return <Spinner className="size-4" />
  }

  if (!status.configured) {
    return <p className="text-muted-foreground text-sm">{t("importNotConfigured")}</p>
  }

  if (!status.connected) {
    if (connectUrl) {
      return (
        <div className="flex items-center gap-3">
          <Spinner className="size-4" />
          <span className="text-sm">{t("importConnecting")}</span>
          <Button variant="ghost" size="sm" onClick={() => openExternal(connectUrl)}>
            {t("importOpenBrowser")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto"
            onClick={() => cancel.current?.abort()}
          >
            {t("importCancel")}
          </Button>
        </div>
      )
    }
    return (
      <Button variant="outline" size="sm" className="w-fit" onClick={connect}>
        <Icon name="apps" className="size-4" />
        {t("importConnect")}
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-sm">
          {status.email ? t("importConnectedAs", { email: status.email }) : t("importConnected")}
        </span>
        <Button variant="ghost" size="sm" disabled={Boolean(busy)} onClick={disconnect}>
          {t("importDisconnect")}
        </Button>
      </div>

      {busy && pickerUrl ? (
        <div className="flex items-center gap-3">
          <Spinner className="size-4" />
          <span className="text-sm">{t("importPicking")}</span>
          <Button variant="ghost" size="sm" onClick={() => openExternal(pickerUrl)}>
            {t("importOpenPicker")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto"
            onClick={() => cancel.current?.abort()}
          >
            {t("importCancel")}
          </Button>
        </div>
      ) : busy && progress ? (
        <div className="flex items-center gap-3">
          <Spinner className="size-4" />
          <span className="text-sm">
            {t("importing", { done: progress.done, total: progress.total })}
          </span>
          {progress.current ? (
            <span className="text-muted-foreground max-w-[12rem] truncate text-xs">
              {progress.current}
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="ms-auto"
            onClick={() => cancel.current?.abort()}
          >
            {t("importCancel")}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => run("photos")}>
            <Icon name="photo" className="size-4" />
            {t("importPhotos")}
          </Button>
          <Button variant="outline" size="sm" onClick={() => run("drive")}>
            <Icon name="folder" className="size-4" />
            {t("importDrive")}
          </Button>
        </div>
      )}

      <p className="text-muted-foreground text-xs">{t("importNote")}</p>
      {!busy ? (
        <p className="text-muted-foreground text-xs">{t("importPickerNote")}</p>
      ) : null}
    </div>
  )
}

export default MigrateGoogle
