import { useState } from "react"
import { useTranslation } from "react-i18next"
import type { DriveNode } from "@workspace/core/drive"
import { unlockFolder } from "@lib/folderLock"
import { Lock } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

interface FolderLockGateProps {
  node: DriveNode
  onUnlocked: () => void
}

const FolderLockGate = ({ node, onUnlocked }: FolderLockGateProps) => {
  const { t } = useTranslation("drive")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!password) return
    setBusy(true)
    setError(null)
    if (await unlockFolder(node.id, password)) onUnlocked()
    else {
      setError(t("folderLockGate.incorrectPassword"))
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl">
        <Lock className="size-7" />
      </div>
      <div>
        <p className="text-sm font-medium">{t("folderLockGate.locked", { name: node.name })}</p>
        <p className="text-muted-foreground text-xs">{t("folderLockGate.enterPasswordHint")}</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Input
          autoFocus
          type="password"
          name="orbit-folder-unlock"
          autoComplete="off"
          placeholder={t("folderLockGate.passwordPlaceholder")}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void submit()}
        />
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button disabled={busy || !password} onClick={() => void submit()}>
          {t("folderLockGate.unlock")}
        </Button>
      </div>
    </div>
  )
}

export default FolderLockGate
