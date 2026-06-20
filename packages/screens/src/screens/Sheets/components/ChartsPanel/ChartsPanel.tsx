import { X } from "@phosphor-icons/react"
import { useTranslation } from "react-i18next"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { type ChartDef, a1Range } from "@pages/Sheets/sheetModel"
import type { SheetController } from "@pages/Sheets/useSheet"
import ChartView from "@pages/Sheets/components/ChartView/ChartView"

const ChartsPanel = ({ sheet }: { sheet: SheetController }) => {
  const { t } = useTranslation("sheets")
  return (
  <aside className="bg-card flex w-80 shrink-0 flex-col gap-3 overflow-y-auto border-l p-3">
    <span className="text-sm font-medium">{t("chartsPanel.charts")}</span>
    {sheet.charts.map((chart) => (
      <div key={chart.id} className="border-border/60 flex flex-col gap-2 rounded-lg border p-2.5">
        <div className="flex items-center gap-2">
          <Select
            value={chart.type}
            onValueChange={(value) =>
              sheet.updateChart(chart.id, { type: value as ChartDef["type"] })
            }
          >
            <SelectTrigger size="sm" className="h-7 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">{t("chartsPanel.bar")}</SelectItem>
              <SelectItem value="line">{t("chartsPanel.line")}</SelectItem>
              <SelectItem value="pie">{t("chartsPanel.pie")}</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-muted-foreground flex-1 truncate text-xs">
            {a1Range(chart.range)}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("chartsPanel.removeChart")}
            onClick={() => sheet.removeChart(chart.id)}
          >
            <X className="size-4" />
          </Button>
        </div>
        <ChartView sheet={sheet} chart={chart} />
      </div>
    ))}
  </aside>
  )
}

export default ChartsPanel
