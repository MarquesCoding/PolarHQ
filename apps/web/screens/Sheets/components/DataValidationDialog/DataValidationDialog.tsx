"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { IconTrash } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { type DataRule, a1Range } from "@pages/Sheets/sheetModel"
import type { SheetController } from "@pages/Sheets/useSheet"

const DataValidationDialog = ({
  sheet,
  open,
  onOpenChange,
}: {
  sheet: SheetController
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const { t } = useTranslation("sheets")
  const [kind, setKind] = useState<DataRule["kind"]>("list")
  const [spec, setSpec] = useState("")

  const describe = (rule: DataRule): string =>
    rule.kind === "list"
      ? t("dataValidationDialog.describeList", { spec: rule.spec, range: a1Range(rule.range) })
      : t("dataValidationDialog.describeNumber", { spec: rule.spec, range: a1Range(rule.range) })

  const add = () => {
    if (!spec.trim()) return
    sheet.addDataRule({ range: { ...sheet.selBox }, kind, spec: spec.trim() })
    setSpec("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dataValidationDialog.title")}</DialogTitle>
        </DialogHeader>

        {sheet.dataRules.length > 0 ? (
          <div className="flex flex-col gap-1">
            {sheet.dataRules.map((rule, i) => (
              <div
                key={i}
                className="bg-muted/40 flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm"
              >
                <span className="truncate">{describe(rule)}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("dataValidationDialog.removeRule")}
                  onClick={() => sheet.removeDataRule(i)}
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("dataValidationDialog.noRulesYet")}</p>
        )}

        <div className="border-border/60 flex flex-col gap-3 border-t pt-3">
          <p className="text-muted-foreground text-xs">
            {t("dataValidationDialog.newRuleAppliesTo")}{" "}
            <span className="text-foreground font-medium">{a1Range(sheet.selBox)}</span>
          </p>
          <div className="flex items-center gap-2">
            <Select value={kind} onValueChange={(value) => setKind(value as DataRule["kind"])}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">{t("dataValidationDialog.listOfItems")}</SelectItem>
                <SelectItem value="number">{t("dataValidationDialog.numberRange")}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={spec}
              onChange={(event) => setSpec(event.target.value)}
              placeholder={
                kind === "list"
                  ? t("dataValidationDialog.listPlaceholder")
                  : t("dataValidationDialog.numberPlaceholder")
              }
              className="h-8 flex-1"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {kind === "list"
              ? t("dataValidationDialog.listHint")
              : t("dataValidationDialog.numberHint")}
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={add}>
              {t("dataValidationDialog.addRule")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DataValidationDialog
