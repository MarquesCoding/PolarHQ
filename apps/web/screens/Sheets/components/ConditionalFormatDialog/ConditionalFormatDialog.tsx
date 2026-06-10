"use client"

import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { IconTrash } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { type CondRule, type CondType, a1Range } from "@pages/Sheets/sheetModel"
import type { SheetController } from "@pages/Sheets/useSheet"
import { t } from "@lib/i18n/config"

const TYPES: Array<{ value: CondType; label: string }> = [
  { value: "gt", label: t("sheets:conditionalFormatDialog.greaterThan") },
  { value: "lt", label: t("sheets:conditionalFormatDialog.lessThan") },
  { value: "eq", label: t("sheets:conditionalFormatDialog.equalTo") },
  { value: "between", label: t("sheets:conditionalFormatDialog.isBetween") },
  { value: "contains", label: t("sheets:conditionalFormatDialog.textContains") },
  { value: "scale", label: t("sheets:conditionalFormatDialog.colorScale") },
]

const describe = (rule: CondRule): string => {
  const label = TYPES.find((t) => t.value === rule.type)?.label ?? rule.type
  if (rule.type === "scale")
    return `${t("sheets:conditionalFormatDialog.colorScale")} · ${a1Range(rule.range)}`
  if (rule.type === "between") return `${label} ${rule.v1}–${rule.v2} · ${a1Range(rule.range)}`
  return `${label} ${rule.v1} · ${a1Range(rule.range)}`
}

const ColorField = ({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) => {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => ref.current?.click()}
    >
      <span className="size-4 rounded-sm border" style={{ backgroundColor: value }} />
      {label}
      <input
        ref={ref}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </Button>
  )
}

const ConditionalFormatDialog = ({
  sheet,
  open,
  onOpenChange,
}: {
  sheet: SheetController
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const { t } = useTranslation("sheets")
  const [type, setType] = useState<CondType>("gt")
  const [v1, setV1] = useState("")
  const [v2, setV2] = useState("")
  const [bg, setBg] = useState("#fee2e2")
  const [color, setColor] = useState("#b91c1c")
  const [minColor, setMinColor] = useState("#fee2e2")
  const [maxColor, setMaxColor] = useState("#bbf7d0")

  const add = () => {
    const range = { ...sheet.selBox }
    const rule: CondRule =
      type === "scale"
        ? { range, type, minColor, maxColor }
        : { range, type, v1, v2: type === "between" ? v2 : undefined, bg, color }
    sheet.addCondFormat(rule)
    setV1("")
    setV2("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("conditionalFormatDialog.title")}</DialogTitle>
        </DialogHeader>

        {sheet.condFormats.length > 0 ? (
          <div className="flex flex-col gap-1">
            {sheet.condFormats.map((rule, i) => (
              <div
                key={i}
                className="bg-muted/40 flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm"
              >
                <span className="truncate">{describe(rule)}</span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("conditionalFormatDialog.removeRule")}
                  onClick={() => sheet.removeCondFormat(i)}
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("conditionalFormatDialog.noRulesYet")}</p>
        )}

        <div className="border-border/60 flex flex-col gap-3 border-t pt-3">
          <p className="text-muted-foreground text-xs">
            {t("conditionalFormatDialog.newRuleAppliesTo")}{" "}
            <span className="text-foreground font-medium">{a1Range(sheet.selBox)}</span>
          </p>
          <Select value={type} onValueChange={(value) => setType(value as CondType)}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {type === "scale" ? (
            <div className="flex items-center gap-2">
              <ColorField label={t("conditionalFormatDialog.low")} value={minColor} onChange={setMinColor} />
              <ColorField label={t("conditionalFormatDialog.high")} value={maxColor} onChange={setMaxColor} />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Input
                value={v1}
                onChange={(event) => setV1(event.target.value)}
                placeholder={
                  type === "contains"
                    ? t("conditionalFormatDialog.text")
                    : t("conditionalFormatDialog.value")
                }
                className="h-8 w-28"
              />
              {type === "between" ? (
                <Input
                  value={v2}
                  onChange={(event) => setV2(event.target.value)}
                  placeholder={t("conditionalFormatDialog.and")}
                  className="h-8 w-28"
                />
              ) : null}
              <ColorField label={t("conditionalFormatDialog.fill")} value={bg} onChange={setBg} />
              <ColorField label={t("conditionalFormatDialog.text")} value={color} onChange={setColor} />
            </div>
          )}

          <div className="flex justify-end">
            <Button size="sm" onClick={add}>
              {t("conditionalFormatDialog.addRule")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ConditionalFormatDialog
