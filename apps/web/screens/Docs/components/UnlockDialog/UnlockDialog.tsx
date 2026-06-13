"use client"

import { useEffect, useState } from "react"
import { isEnrolled, setupKeys, unlockKeys, unlockWithRecovery } from "@lib/e2e"
import { IconCopy, IconShieldLock } from "@tabler/icons-react"
import { Button } from "@polarhq/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@polarhq/ui/components/dialog"
import { Input } from "@polarhq/ui/components/input"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

interface UnlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUnlocked: () => void
}

/** Sets up or unlocks the user's encryption keys (Proton-style: one password unlocks the keypair). */
const UnlockDialog = ({ open, onOpenChange, onUnlocked }: UnlockDialogProps) => {
  const { t } = useTranslation("docs")
  const [enrolled, setEnrolled] = useState<boolean | null>(null)
  const [password, setPassword] = useState("")
  const [recoveryInput, setRecoveryInput] = useState("")
  const [mode, setMode] = useState<"password" | "recovery">("password")
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setEnrolled(null)
    setPassword("")
    setRecoveryInput("")
    setError(null)
    setRecoveryCode(null)
    setMode("password")
    void isEnrolled().then(setEnrolled)
  }, [open])

  const finish = () => {
    onUnlocked()
    onOpenChange(false)
  }

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      if (enrolled === false) {
        const result = await setupKeys(password)
        setRecoveryCode(result.recoveryCode)
      } else if (mode === "recovery") {
        if (await unlockWithRecovery(recoveryInput)) finish()
        else setError(t("unlockDialog.invalidRecoveryCode"))
      } else if (await unlockKeys(password)) {
        finish()
      } else {
        setError(t("unlockDialog.incorrectPassword"))
      }
    } catch {
      setError(t("unlockDialog.somethingWentWrong"))
    } finally {
      setBusy(false)
    }
  }

  const title = recoveryCode
    ? t("unlockDialog.saveRecoveryCode")
    : enrolled === false
      ? t("unlockDialog.setUpEncryption")
      : t("unlockDialog.unlockEncryption")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconShieldLock className="size-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        {recoveryCode ? (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              {t("unlockDialog.recoveryCodeDescription")}
            </p>
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 rounded-md px-2 py-1.5 font-mono text-xs break-all">
                {recoveryCode}
              </code>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={t("unlockDialog.copyRecoveryCode")}
                onClick={() => {
                  void navigator.clipboard.writeText(recoveryCode)
                  toast.success(t("unlockDialog.recoveryCodeCopied"))
                }}
              >
                <IconCopy className="size-4" />
              </Button>
            </div>
          </div>
        ) : enrolled === null ? (
          <p className="text-muted-foreground py-4 text-sm">{t("unlockDialog.checkingKeys")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              {enrolled
                ? t("unlockDialog.enterPasswordUnlock")
                : t("unlockDialog.enterPasswordSetup")}
            </p>
            {mode === "recovery" ? (
              <Input
                autoFocus
                name="vault-recovery-code"
                autoComplete="off"
                placeholder={t("unlockDialog.recoveryCodePlaceholder")}
                value={recoveryInput}
                onChange={(event) => setRecoveryInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void submit()}
              />
            ) : (
              <Input
                autoFocus
                type="password"
                name="vault-unlock-key"
                autoComplete="off"
                placeholder={t("unlockDialog.passwordPlaceholder")}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && password && void submit()}
              />
            )}
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            {enrolled ? (
              <Button
                variant="link"
                size="sm"
                className="h-auto w-fit px-0"
                onClick={() => {
                  setError(null)
                  setMode((value) => (value === "recovery" ? "password" : "recovery"))
                }}
              >
                {mode === "recovery"
                  ? t("unlockDialog.usePasswordInstead")
                  : t("unlockDialog.useRecoveryCode")}
              </Button>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {recoveryCode ? (
            <Button onClick={finish}>{t("unlockDialog.savedIt")}</Button>
          ) : enrolled !== null ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("unlockDialog.cancel")}
              </Button>
              <Button
                disabled={busy || (mode === "recovery" ? !recoveryInput.trim() : !password)}
                onClick={() => void submit()}
              >
                {enrolled === false ? t("unlockDialog.setUp") : t("unlockDialog.unlock")}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UnlockDialog
