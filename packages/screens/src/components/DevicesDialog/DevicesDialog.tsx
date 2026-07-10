import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import DeviceList from "@components/DevicesDialog/DeviceList"
import { useTranslation } from "react-i18next"

interface DevicesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DevicesDialog = ({ open, onOpenChange }: DevicesDialogProps) => {
  const { t } = useTranslation("common")
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("devicesDialog.title")}</DialogTitle>
        </DialogHeader>
        <DeviceList />
      </DialogContent>
    </Dialog>
  )
}

export default DevicesDialog
