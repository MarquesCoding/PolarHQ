import { Copy, ShieldCheck } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

interface RecoveryCodeDialogProps {
  recoveryCode: string
  onContinue: () => void
}

/** Shown once, right after E2E keys are first set up, so the user can save their recovery code. */
const RecoveryCodeDialog = ({ recoveryCode, onContinue }: RecoveryCodeDialogProps) => {
  const { t } = useTranslation("common")
  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5" />
            {t("recoveryCodeDialog.title")}
          </DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">{t("recoveryCodeDialog.description")}</p>
        <div className="flex items-center gap-2">
          <code className="bg-muted flex-1 rounded-md px-2 py-1.5 font-mono text-xs break-all">
            {recoveryCode}
          </code>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("recoveryCodeDialog.copyAriaLabel")}
            onClick={() => {
              void navigator.clipboard.writeText(recoveryCode)
              toast.success(t("recoveryCodeDialog.copied"))
            }}
          >
            <Copy className="size-4" />
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onContinue}>{t("recoveryCodeDialog.continue")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RecoveryCodeDialog
