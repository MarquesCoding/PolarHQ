"use client"

import { IconCopy, IconShieldLock } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { toast } from "sonner"

interface RecoveryCodeDialogProps {
  recoveryCode: string
  onContinue: () => void
}

/** Shown once, right after E2E keys are first set up, so the user can save their recovery code. */
const RecoveryCodeDialog = ({ recoveryCode, onContinue }: RecoveryCodeDialogProps) => (
  <Dialog open onOpenChange={() => undefined}>
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <IconShieldLock className="size-5" />
          Save your recovery code
        </DialogTitle>
      </DialogHeader>
      <p className="text-muted-foreground text-sm">
        Your account is now end-to-end encrypted. This recovery code is the only way to recover your
        data if you forget your password — store it somewhere safe. We can&rsquo;t show it again.
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
      <DialogFooter>
        <Button onClick={onContinue}>I&rsquo;ve saved it — continue</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export default RecoveryCodeDialog
