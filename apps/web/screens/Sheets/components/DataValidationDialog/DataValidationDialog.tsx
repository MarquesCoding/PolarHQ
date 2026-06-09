"use client"

import { useState } from "react"
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

const describe = (rule: DataRule): string =>
  rule.kind === "list"
    ? `List: ${rule.spec} · ${a1Range(rule.range)}`
    : `Number ${rule.spec} · ${a1Range(rule.range)}`

const DataValidationDialog = ({
  sheet,
  open,
  onOpenChange,
}: {
  sheet: SheetController
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const [kind, setKind] = useState<DataRule["kind"]>("list")
  const [spec, setSpec] = useState("")

  const add = () => {
    if (!spec.trim()) return
    sheet.addDataRule({ range: { ...sheet.selBox }, kind, spec: spec.trim() })
    setSpec("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Data validation</DialogTitle>
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
                  aria-label="Remove rule"
                  onClick={() => sheet.removeDataRule(i)}
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No rules yet.</p>
        )}

        <div className="border-border/60 flex flex-col gap-3 border-t pt-3">
          <p className="text-muted-foreground text-xs">
            New rule applies to{" "}
            <span className="text-foreground font-medium">{a1Range(sheet.selBox)}</span>
          </p>
          <div className="flex items-center gap-2">
            <Select value={kind} onValueChange={(value) => setKind(value as DataRule["kind"])}>
              <SelectTrigger size="sm" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="list">List of items</SelectItem>
                <SelectItem value="number">Number range</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={spec}
              onChange={(event) => setSpec(event.target.value)}
              placeholder={kind === "list" ? "Red, Green, Blue" : "0, 100"}
              className="h-8 flex-1"
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {kind === "list"
              ? "Comma-separated allowed values."
              : "Minimum and maximum, comma-separated (either may be blank)."}
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={add}>
              Add rule
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default DataValidationDialog
