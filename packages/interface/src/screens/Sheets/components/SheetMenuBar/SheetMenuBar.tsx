"use client"

import { type ReactNode, useState } from "react"
import { useRouter } from "@polarhq/interface/lib/router"
import { useTranslation } from "react-i18next"
import { Button } from "@polarhq/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@polarhq/ui/components/dropdown-menu"
import { toast } from "sonner"
import { ZOOM_LEVELS } from "@polarhq/interface/screens/Sheets/sheetModel"
import type { SheetController } from "@polarhq/interface/screens/Sheets/useSheet"
import ConditionalFormatDialog from "@polarhq/interface/screens/Sheets/components/ConditionalFormatDialog/ConditionalFormatDialog"
import DataValidationDialog from "@polarhq/interface/screens/Sheets/components/DataValidationDialog/DataValidationDialog"
import NumberFormatItems from "@polarhq/interface/screens/Sheets/components/NumberFormatItems/NumberFormatItems"

const Menu = ({ label, children }: { label: string; children: ReactNode }) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button variant="ghost" size="sm" className="px-2 font-normal">
          {label}
        </Button>
      }
    />
    <DropdownMenuContent align="start" className="min-w-52">
      {children}
    </DropdownMenuContent>
  </DropdownMenu>
)

const SheetMenuBar = ({ sheet, title }: { sheet: SheetController; title: string }) => {
  const { t } = useTranslation("sheets")
  const router = useRouter()
  const [cfOpen, setCfOpen] = useState(false)
  const [dvOpen, setDvOpen] = useState(false)

  const copy = async () => {
    const box = sheet.selBox
    const rows: string[] = []
    for (let r = box.r0; r <= box.r1; r += 1) {
      const cols: string[] = []
      for (let c = box.c0; c <= box.c1; c += 1) cols.push(sheet.rawAt(r, c))
      rows.push(cols.join("\t"))
    }
    try {
      await navigator.clipboard.writeText(rows.join("\n"))
    } catch {
      toast.error(t("sheetMenuBar.clipboardUnavailable"))
    }
  }

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const start = sheet.sel.focus
      text.split(/\r?\n/).forEach((line, i) =>
        line.split("\t").forEach((value, j) => sheet.setRaw(start.r + i, start.c + j, value)),
      )
    } catch {
      toast.error(t("sheetMenuBar.clipboardUnavailable"))
    }
  }

  const cut = async () => {
    await copy()
    sheet.clearContents()
  }

  const exportXlsx = async () => {
    let maxRow = 0
    let maxCol = 0
    sheet.cells.forEach((_value, key) => {
      const [r, c] = key.split(":").map(Number)
      maxRow = Math.max(maxRow, r!)
      maxCol = Math.max(maxCol, c!)
    })
    const rows: string[][] = []
    for (let r = 0; r <= maxRow; r += 1) {
      const row: string[] = []
      for (let c = 0; c <= maxCol; c += 1) row.push(sheet.rawAt(r, c))
      rows.push(row)
    }
    try {
      const { exportSpreadsheet } = await import("@polarhq/vault/officeExport")
      await exportSpreadsheet(rows, title || "Spreadsheet")
    } catch {
      toast.error(t("sheetMenuBar.couldNotExport"))
    }
  }

  return (
    <>
    <div className="bg-card flex items-center gap-0.5 border-b px-1.5 py-0.5 text-sm">
      <Menu label={t("sheetMenuBar.file")}>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("sheetMenuBar.download")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => sheet.downloadCsv(title || "Spreadsheet")}>
              {t("sheetMenuBar.commaSeparatedCsv")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void exportXlsx()}>
              {t("sheetMenuBar.microsoftExcelXlsx")}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => window.print()}>
          {t("sheetMenuBar.print")}
          <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/sheets")}>{t("sheetMenuBar.backToSheets")}</DropdownMenuItem>
      </Menu>

      <Menu label={t("sheetMenuBar.edit")}>
        <DropdownMenuItem disabled={!sheet.canUndo} onClick={sheet.undo}>
          {t("sheetMenuBar.undo")}
          <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!sheet.canRedo} onClick={sheet.redo}>
          {t("sheetMenuBar.redo")}
          <DropdownMenuShortcut>⌘Y</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void cut()}>
          {t("sheetMenuBar.cut")}
          <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void copy()}>
          {t("sheetMenuBar.copy")}
          <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void paste()}>
          {t("sheetMenuBar.paste")}
          <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={sheet.clearContents}>
          {t("sheetMenuBar.deleteValues")}
          <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={sheet.selectAll}>
          {t("sheetMenuBar.selectAll")}
          <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
        </DropdownMenuItem>
      </Menu>

      <Menu label={t("sheetMenuBar.view")}>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("sheetMenuBar.zoom")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {ZOOM_LEVELS.map((level) => (
              <DropdownMenuCheckboxItem
                key={level}
                checked={sheet.zoom === level}
                onCheckedChange={() => sheet.setZoom(level)}
              >
                {level}%
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuCheckboxItem
          checked={sheet.gridlines}
          onCheckedChange={(value) => sheet.setGridlines(value)}
        >
          {t("sheetMenuBar.gridlines")}
        </DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("sheetMenuBar.freezeColumns")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuCheckboxItem
              checked={sheet.freezeCols === 0}
              onCheckedChange={() => sheet.setFreezeCols(0)}
            >
              {t("sheetMenuBar.noColumns")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sheet.freezeCols === 1}
              onCheckedChange={() => sheet.setFreezeCols(1)}
            >
              {t("sheetMenuBar.column_one", { count: 1 })}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sheet.freezeCols === 2}
              onCheckedChange={() => sheet.setFreezeCols(2)}
            >
              {t("sheetMenuBar.column_other", { count: 2 })}
            </DropdownMenuCheckboxItem>
            <DropdownMenuItem onClick={() => sheet.setFreezeCols(sheet.selBox.c1 + 1)}>
              {t("sheetMenuBar.upToCurrentColumn")}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </Menu>

      <Menu label={t("sheetMenuBar.insert")}>
        <DropdownMenuItem onClick={() => sheet.insertRow("above")}>{t("sheetMenuBar.rowAbove")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.insertRow("below")}>{t("sheetMenuBar.rowBelow")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.insertColumn("left")}>{t("sheetMenuBar.columnLeft")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.insertColumn("right")}>{t("sheetMenuBar.columnRight")}</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => sheet.addChart({ type: "bar", range: { ...sheet.selBox }, title: "Chart" })}
        >
          {t("sheetMenuBar.chartFromSelection")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => sheet.startEdit(sheet.sel.focus, "=")}>{t("sheetMenuBar.function")}</DropdownMenuItem>
      </Menu>

      <Menu label={t("sheetMenuBar.format")}>
        <DropdownMenuItem onClick={() => sheet.toggle("b")}>
          {t("sheetMenuBar.bold")}
          <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.toggle("i")}>
          {t("sheetMenuBar.italic")}
          <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.toggle("u")}>
          {t("sheetMenuBar.underline")}
          <DropdownMenuShortcut>⌘U</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.toggle("s")}>{t("sheetMenuBar.strikethrough")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("sheetMenuBar.number")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-56">
            <NumberFormatItems sheet={sheet} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("sheetMenuBar.alignment")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => sheet.applyFormat({ align: "left" })}>{t("sheetMenuBar.left")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => sheet.applyFormat({ align: "center" })}>{t("sheetMenuBar.center")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => sheet.applyFormat({ align: "right" })}>{t("sheetMenuBar.right")}</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("sheetMenuBar.mergeCells")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={sheet.mergeSelection}>{t("sheetMenuBar.mergeAll")}</DropdownMenuItem>
            <DropdownMenuItem onClick={sheet.unmergeSelection}>{t("sheetMenuBar.unmerge")}</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => setCfOpen(true)}>{t("sheetMenuBar.conditionalFormatting")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={sheet.clearFormatting}>{t("sheetMenuBar.clearFormatting")}</DropdownMenuItem>
      </Menu>

      <Menu label={t("sheetMenuBar.data")}>
        <DropdownMenuItem onClick={() => sheet.sortSelection("asc")}>{t("sheetMenuBar.sortRangeAtoZ")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.sortSelection("desc")}>{t("sheetMenuBar.sortRangeZtoA")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setDvOpen(true)}>{t("sheetMenuBar.dataValidation")}</DropdownMenuItem>
      </Menu>

      <Menu label={t("sheetMenuBar.help")}>
        <DropdownMenuItem
          onClick={() =>
            toast.info(t("sheetMenuBar.shortcutsToast"))
          }
        >
          {t("sheetMenuBar.keyboardShortcuts")}
        </DropdownMenuItem>
      </Menu>
    </div>
      <ConditionalFormatDialog sheet={sheet} open={cfOpen} onOpenChange={setCfOpen} />
      <DataValidationDialog sheet={sheet} open={dvOpen} onOpenChange={setDvOpen} />
    </>
  )
}

export default SheetMenuBar
