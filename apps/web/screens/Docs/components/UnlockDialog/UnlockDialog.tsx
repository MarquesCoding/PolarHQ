"use client"

import { useEffect, useState } from "react"
import { isEnrolled, setupKeys, unlockKeys, unlockWithRecovery } from "@lib/e2e"
import { IconCopy, IconShieldLock } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { toast } from "sonner"

interface UnlockDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUnlocked: () => void
}

/** Sets up or unlocks the user's encryption keys (Proton-style: one password unlocks the keypair). */
const UnlockDialog = ({ open, onOpenChange, onUnlocked }: UnlockDialogProps) => {
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
        else setError("Invalid recovery code.")
      } else if (await unlockKeys(password)) {
        finish()
      } else {
        setError("Incorrect password.")
      }
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const title = recoveryCode
    ? "Save your recovery code"
    : enrolled === false
      ? "Set up encryption"
      : "Unlock encryption"

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
              This is the only way to recover your encrypted documents if you forget your password.
              Store it somewhere safe — we can’t show it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 rounded-md px-2 py-1.5 font-mono text-xs break-all">
                {recoveryCode}
              </code>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Copy recovery code"
                onClick={() => {
                  void navigator.clipboard.writeText(recoveryCode)
                  toast.success("Recovery code copied")
                }}
              >
                <IconCopy className="size-4" />
              </Button>
            </div>
          </div>
        ) : enrolled === null ? (
          <p className="text-muted-foreground py-4 text-sm">Checking your keys…</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground text-sm">
              {enrolled
                ? "Enter your password to decrypt your documents on this device."
                : "Choose a password to protect your documents. Only you can decrypt them — not even the server can read them."}
            </p>
            {mode === "recovery" ? (
              <Input
                autoFocus
                placeholder="Recovery code"
                value={recoveryInput}
                onChange={(event) => setRecoveryInput(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void submit()}
              />
            ) : (
              <Input
                autoFocus
                type="password"
                placeholder="Password"
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
                {mode === "recovery" ? "Use password instead" : "Use a recovery code"}
              </Button>
            ) : null}
          </div>
        )}

        <DialogFooter>
          {recoveryCode ? (
            <Button onClick={finish}>I’ve saved it</Button>
          ) : enrolled !== null ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                disabled={busy || (mode === "recovery" ? !recoveryInput.trim() : !password)}
                onClick={() => void submit()}
              >
                {enrolled === false ? "Set up" : "Unlock"}
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default UnlockDialog
