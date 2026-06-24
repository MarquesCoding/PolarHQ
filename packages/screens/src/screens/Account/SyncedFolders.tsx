import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  type SyncProgress,
  type SyncedFolderInfo,
  getSyncBridge,
} from "@workspace/screens/syncBridge"
import { Button } from "@workspace/ui/components/button"
import { ArrowsClockwise, FolderSimple, Trash } from "@phosphor-icons/react"
import Spinner from "@components/Spinner/Spinner"
import { toast } from "sonner"

/**
 * Account section for desktop folder sync (Dropbox/Mega-style). Renders only inside the desktop shell —
 * it drives the {@link getSyncBridge} bridge the Tauri app registers; on web there's no bridge so the
 * whole section returns null.
 */
const SyncedFolders = () => {
  const { t } = useTranslation("account")
  const bridge = getSyncBridge()
  const [folders, setFolders] = useState<SyncedFolderInfo[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [adding, setAdding] = useState(false)

  const reload = () => {
    bridge
      ?.list()
      .then(setFolders)
      .catch(() => setFolders([]))
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!bridge) return null

  const sync = async (id: string) => {
    setBusyId(id)
    setProgress({ total: 0, done: 0, current: null })
    try {
      const result = await bridge.sync(id, setProgress)
      toast.success(t("sync.synced", { count: result.uploaded, failed: result.failed }))
    } catch {
      toast.error(t("sync.syncError"))
    } finally {
      setBusyId(null)
      setProgress(null)
      reload()
    }
  }

  const add = async () => {
    setAdding(true)
    try {
      const added = await bridge.add()
      if (added) {
        reload()
        void sync(added.id)
      }
    } catch {
      toast.error(t("sync.addError"))
    } finally {
      setAdding(false)
    }
  }

  const remove = async (id: string) => {
    await bridge.remove(id).catch(() => undefined)
    reload()
  }

  return (
    <section className="panel flex flex-col gap-4 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold">{t("sync.title")}</h2>
          <p className="text-muted-foreground text-xs">{t("sync.hint")}</p>
        </div>
        <Button variant="outline" size="sm" disabled={adding} onClick={add}>
          <FolderSimple className="size-4" />
          {t("sync.addFolder")}
        </Button>
      </div>

      {folders === null ? (
        <Spinner className="size-4" />
      ) : folders.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("sync.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {folders.map((folder) => {
            const busy = busyId === folder.id
            return (
              <li
                key={folder.id}
                className="bg-sidebar-accent/30 flex items-center gap-3 rounded-lg px-3 py-2"
              >
                <FolderSimple className="text-muted-foreground size-5 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{folder.name}</span>
                  <span className="text-muted-foreground truncate text-xs">{folder.localPath}</span>
                </div>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {busy && progress
                    ? t("sync.syncing", { done: progress.done, total: progress.total })
                    : folder.lastSyncedAt
                      ? t("sync.lastSynced", {
                          time: new Date(folder.lastSyncedAt).toLocaleString(),
                        })
                      : t("sync.never")}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("sync.syncNow")}
                  disabled={busy}
                  onClick={() => sync(folder.id)}
                >
                  {busy ? <Spinner className="size-4" /> : <ArrowsClockwise className="size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("sync.remove")}
                  disabled={busy}
                  onClick={() => remove(folder.id)}
                >
                  <Trash className="size-4" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default SyncedFolders
