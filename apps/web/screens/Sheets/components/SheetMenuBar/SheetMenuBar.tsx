"use client"

import { type ReactNode, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
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
} from "@workspace/ui/components/dropdown-menu"
import { toast } from "sonner"
import { ZOOM_LEVELS } from "@pages/Sheets/sheetModel"
import type { SheetController } from "@pages/Sheets/useSheet"
import ConditionalFormatDialog from "@pages/Sheets/components/ConditionalFormatDialog/ConditionalFormatDialog"
import DataValidationDialog from "@pages/Sheets/components/DataValidationDialog/DataValidationDialog"
import NumberFormatItems from "@pages/Sheets/components/NumberFormatItems/NumberFormatItems"

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
      toast.error("Clipboard unavailable")
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
      toast.error("Clipboard unavailable")
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
      const { exportSpreadsheet } = await import("@lib/officeExport")
      await exportSpreadsheet(rows, title || "Spreadsheet")
    } catch {
      toast.error("Could not export")
    }
  }

  return (
    <>
    <div className="bg-card flex items-center gap-0.5 border-b px-1.5 py-0.5 text-sm">
      <Menu label="File">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Download</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => sheet.downloadCsv(title || "Spreadsheet")}>
              Comma-separated (.csv)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void exportXlsx()}>
              Microsoft Excel (.xlsx)
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => window.print()}>
          Print
          <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/sheets")}>Back to Sheets</DropdownMenuItem>
      </Menu>

      <Menu label="Edit">
        <DropdownMenuItem disabled={!sheet.canUndo} onClick={sheet.undo}>
          Undo
          <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!sheet.canRedo} onClick={sheet.redo}>
          Redo
          <DropdownMenuShortcut>⌘Y</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void cut()}>
          Cut
          <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void copy()}>
          Copy
          <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void paste()}>
          Paste
          <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={sheet.clearContents}>
          Delete values
          <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={sheet.selectAll}>
          Select all
          <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
        </DropdownMenuItem>
      </Menu>

      <Menu label="View">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Zoom</DropdownMenuSubTrigger>
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
          Gridlines
        </DropdownMenuCheckboxItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Freeze columns</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuCheckboxItem
              checked={sheet.freezeCols === 0}
              onCheckedChange={() => sheet.setFreezeCols(0)}
            >
              No columns
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sheet.freezeCols === 1}
              onCheckedChange={() => sheet.setFreezeCols(1)}
            >
              1 column
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sheet.freezeCols === 2}
              onCheckedChange={() => sheet.setFreezeCols(2)}
            >
              2 columns
            </DropdownMenuCheckboxItem>
            <DropdownMenuItem onClick={() => sheet.setFreezeCols(sheet.selBox.c1 + 1)}>
              Up to current column
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </Menu>

      <Menu label="Insert">
        <DropdownMenuItem onClick={() => sheet.insertRow("above")}>Row above</DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.insertRow("below")}>Row below</DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.insertColumn("left")}>Column left</DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.insertColumn("right")}>Column right</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => sheet.addChart({ type: "bar", range: { ...sheet.selBox }, title: "Chart" })}
        >
          Chart from selection
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => sheet.startEdit(sheet.sel.focus, "=")}>Function</DropdownMenuItem>
      </Menu>

      <Menu label="Format">
        <DropdownMenuItem onClick={() => sheet.toggle("b")}>
          Bold
          <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.toggle("i")}>
          Italic
          <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.toggle("u")}>
          Underline
          <DropdownMenuShortcut>⌘U</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.toggle("s")}>Strikethrough</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Number</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-56">
            <NumberFormatItems sheet={sheet} />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Alignment</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => sheet.applyFormat({ align: "left" })}>Left</DropdownMenuItem>
            <DropdownMenuItem onClick={() => sheet.applyFormat({ align: "center" })}>Center</DropdownMenuItem>
            <DropdownMenuItem onClick={() => sheet.applyFormat({ align: "right" })}>Right</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Merge cells</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={sheet.mergeSelection}>Merge all</DropdownMenuItem>
            <DropdownMenuItem onClick={sheet.unmergeSelection}>Unmerge</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => setCfOpen(true)}>Conditional formatting…</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={sheet.clearFormatting}>Clear formatting</DropdownMenuItem>
      </Menu>

      <Menu label="Data">
        <DropdownMenuItem onClick={() => sheet.sortSelection("asc")}>Sort range A → Z</DropdownMenuItem>
        <DropdownMenuItem onClick={() => sheet.sortSelection("desc")}>Sort range Z → A</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setDvOpen(true)}>Data validation…</DropdownMenuItem>
      </Menu>

      <Menu label="Help">
        <DropdownMenuItem
          onClick={() =>
            toast.info("Shortcuts: ⌘Z undo · ⌘B/I/U format · ⌘A select all · Enter edit · Tab next")
          }
        >
          Keyboard shortcuts
        </DropdownMenuItem>
      </Menu>
    </div>
      <ConditionalFormatDialog sheet={sheet} open={cfOpen} onOpenChange={setCfOpen} />
      <DataValidationDialog sheet={sheet} open={dvOpen} onOpenChange={setDvOpen} />
    </>
  )
}

export default SheetMenuBar
