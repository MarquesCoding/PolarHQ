"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  CompactSelection,
  DataEditor,
  type DataEditorRef,
  type EditableGridCell,
  type GridCell,
  GridCellKind,
  type GridColumn,
  type GridSelection,
  type Item,
  type Theme,
} from "@glideapps/glide-data-grid"
import "@glideapps/glide-data-grid/dist/index.css"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { COLS, colLabel } from "@pages/Sheets/sheetModel"
import type { SheetController } from "@pages/Sheets/useSheet"

const FONT_FAMILY = "ui-sans-serif, system-ui, -apple-system, sans-serif"

interface Action {
  label: string
  run: () => void
}

const SheetGrid = ({ sheet }: { sheet: SheetController }) => {
  const ref = useRef<DataEditorRef>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const [addN, setAddN] = useState(1000)
  const [overrides, setOverrides] = useState<Record<number, number>>({})
  const [menu, setMenu] = useState<{ x: number; y: number; actions: Array<Action | "sep"> } | null>(null)

  const z = sheet.zoom / 100

  useEffect(() => {
    const repaint = (event: { keysChanged: Set<string> }) => {
      const damage: Array<{ cell: Item }> = []
      event.keysChanged.forEach((key) => {
        const [r, c] = key.split(":").map(Number)
        if (r !== undefined && c !== undefined) damage.push({ cell: [c, r] })
      })
      ref.current?.updateCells(damage)
    }
    sheet.cells.observe(repaint)
    sheet.formats.observe(repaint)
    return () => {
      sheet.cells.unobserve(repaint)
      sheet.formats.unobserve(repaint)
    }
  }, [sheet.cells, sheet.formats])

  const theme: Partial<Theme> = {
    accentColor: "#3b82f6",
    accentFg: "#ffffff",
    accentLight: "rgba(59, 130, 246, 0.18)",
    textDark: "#e5e7eb",
    textMedium: "#cbd5e1",
    textLight: "#94a3b8",
    textBubble: "#e5e7eb",
    bgIconHeader: "#94a3b8",
    fgIconHeader: "#e5e7eb",
    textHeader: "#cbd5e1",
    textHeaderSelected: "#ffffff",
    bgCell: "#0a0a0c",
    bgCellMedium: "#101014",
    bgHeader: "#101014",
    bgHeaderHasFocus: "#1e293b",
    bgHeaderHovered: "#16161c",
    bgBubble: "#1e293b",
    bgBubbleSelected: "#1e293b",
    bgSearchResult: "rgba(59, 130, 246, 0.25)",
    borderColor: "rgba(148, 163, 184, 0.16)",
    drilldownBorder: "rgba(148, 163, 184, 0.2)",
    linkColor: "#60a5fa",
    cellHorizontalPadding: 8,
    headerFontStyle: `600 ${12 * z}px`,
    baseFontStyle: `${13 * z}px`,
    editorFontSize: `${13 * z}px`,
    fontFamily: FONT_FAMILY,
  }

  const columns: GridColumn[] = Array.from({ length: COLS }, (_, c) => ({
    title: colLabel(c),
    id: String(c),
    width: (overrides[c] ?? sheet.colW(c)) * z,
    hasMenu: true,
  }))

  const getCellContent = (item: Item): GridCell => {
    const [c, r] = item
    const f = sheet.fmtAt(r, c)
    const fontParts: string[] = []
    if (f.b) fontParts.push("bold")
    if (f.i) fontParts.push("italic")
    const themeOverride: Partial<Theme> = {}
    if (fontParts.length) themeOverride.baseFontStyle = `${fontParts.join(" ")} ${13 * z}px`
    if (f.color) themeOverride.textDark = f.color
    if (f.bg) themeOverride.bgCell = f.bg
    const merge = sheet.mergeAnchorAt(r, c)
    return {
      kind: GridCellKind.Text,
      data: sheet.rawAt(r, c),
      displayData: sheet.display(r, c),
      allowOverlay: true,
      contentAlign: f.align,
      themeOverride: Object.keys(themeOverride).length > 0 ? themeOverride : undefined,
      span: merge && r === merge.r0 ? [merge.c0, merge.c1] : undefined,
    }
  }

  const onCellEdited = (item: Item, value: EditableGridCell) => {
    if (value.kind === GridCellKind.Text || value.kind === GridCellKind.Number)
      sheet.setRaw(item[1], item[0], String(value.data ?? ""))
  }

  const onCellsEdited = (edits: readonly { location: Item; value: EditableGridCell }[]) => {
    sheet.transact(() => {
      for (const { location, value } of edits) {
        if (value.kind === GridCellKind.Text || value.kind === GridCellKind.Number)
          sheet.setRaw(location[1], location[0], String(value.data ?? ""))
      }
    })
    return true
  }

  const box = sheet.selBox
  const gridSelection: GridSelection = {
    current: {
      cell: [sheet.sel.focus.c, sheet.sel.focus.r],
      range: {
        x: box.c0,
        y: box.r0,
        width: box.c1 - box.c0 + 1,
        height: box.r1 - box.r0 + 1,
      },
      rangeStack: [],
    },
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty(),
  }

  const onGridSelectionChange = (next: GridSelection) => {
    setMenu(null)
    if (next.current) {
      const [col, row] = next.current.cell
      const rect = next.current.range
      const oppC = col === rect.x ? rect.x + rect.width - 1 : rect.x
      const oppR = row === rect.y ? rect.y + rect.height - 1 : rect.y
      sheet.setSel({ anchor: { r: oppR, c: oppC }, focus: { r: row, c: col } })
    } else if (next.columns.length > 0) {
      const c = next.columns.first() ?? 0
      sheet.setSel({ anchor: { r: sheet.rows - 1, c }, focus: { r: 0, c } })
    } else if (next.rows.length > 0) {
      const r = next.rows.first() ?? 0
      sheet.setSel({ anchor: { r, c: COLS - 1 }, focus: { r, c: 0 } })
    }
  }

  const onKeyDown = (event: {
    key: string
    ctrlKey: boolean
    metaKey: boolean
    shiftKey: boolean
    cancel: () => void
  }) => {
    const mod = event.ctrlKey || event.metaKey
    if (mod && (event.key === "z" || event.key === "Z")) {
      event.cancel()
      if (event.shiftKey) sheet.redo()
      else sheet.undo()
    } else if (mod && (event.key === "y" || event.key === "Y")) {
      event.cancel()
      sheet.redo()
    }
  }

  const colActions: Array<Action | "sep"> = [
    { label: "Cut", run: () => void sheet.cutSelection() },
    { label: "Copy", run: () => void sheet.copySelection() },
    { label: "Paste", run: () => void sheet.pasteSelection() },
    "sep",
    { label: "Insert column left", run: () => sheet.insertColumn("left") },
    { label: "Insert column right", run: () => sheet.insertColumn("right") },
    { label: "Delete column", run: () => sheet.deleteColumns() },
    { label: "Clear column", run: () => sheet.clearContents() },
    "sep",
    { label: "Sort A → Z", run: () => sheet.sortSelection("asc") },
    { label: "Sort Z → A", run: () => sheet.sortSelection("desc") },
  ]
  const cellActions: Array<Action | "sep"> = [
    { label: "Cut", run: () => void sheet.cutSelection() },
    { label: "Copy", run: () => void sheet.copySelection() },
    { label: "Paste", run: () => void sheet.pasteSelection() },
    "sep",
    { label: "Insert row above", run: () => sheet.insertRow("above") },
    { label: "Insert row below", run: () => sheet.insertRow("below") },
    { label: "Insert column left", run: () => sheet.insertColumn("left") },
    { label: "Insert column right", run: () => sheet.insertColumn("right") },
    "sep",
    { label: "Delete row", run: () => sheet.deleteRows() },
    { label: "Delete column", run: () => sheet.deleteColumns() },
    { label: "Clear", run: () => sheet.clearContents() },
  ]

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onPointerDownCapture={(event) => {
        pointer.current = { x: event.clientX, y: event.clientY }
      }}
    >
      <div className="min-h-0 flex-1">
        <DataEditor
          ref={ref}
          theme={theme}
          columns={columns}
          rows={sheet.rows}
          rowHeight={(row) => sheet.rowH(row) * z}
          headerHeight={Math.round(30 * z)}
          getCellContent={getCellContent}
          onCellEdited={onCellEdited}
          onCellsEdited={onCellsEdited}
          onKeyDown={onKeyDown}
          getCellsForSelection
          onPaste
          fillHandle
          rowMarkers="number"
          rangeSelect="multi-rect"
          columnSelect="multi"
          rowSelect="multi"
          smoothScrollX
          smoothScrollY
          gridSelection={gridSelection}
          onGridSelectionChange={onGridSelectionChange}
          onColumnResize={(_column, newSize, colIndex) =>
            setOverrides((current) => ({ ...current, [colIndex]: newSize / z }))
          }
          onColumnResizeEnd={(_column, newSize, colIndex) => {
            sheet.setColW(colIndex, newSize / z)
            setOverrides((current) => {
              const next = { ...current }
              delete next[colIndex]
              return next
            })
          }}
          onHeaderMenuClick={(col) => {
            sheet.selectColumn(col)
            setMenu({ x: pointer.current.x, y: pointer.current.y, actions: colActions })
          }}
          onCellContextMenu={(cell, event) => {
            event.preventDefault()
            sheet.selectOnly({ r: cell[1], c: cell[0] })
            setMenu({ x: pointer.current.x, y: pointer.current.y, actions: cellActions })
          }}
          width="100%"
          height="100%"
        />
      </div>

      <div className="bg-card text-muted-foreground flex shrink-0 items-center gap-2 border-t px-3 py-1 text-sm">
        <Button variant="ghost" size="sm" className="text-primary" onClick={() => sheet.addRows(addN)}>
          Add
        </Button>
        <Input
          type="number"
          value={addN}
          min={1}
          onChange={(event) => setAddN(Math.max(1, Number(event.target.value) || 1))}
          className="h-7 w-20"
        />
        more rows at the bottom
      </div>

      {menu
        ? createPortal(
            <>
              <div className="fixed inset-0 z-50" onPointerDown={() => setMenu(null)} />
              <div
                className="bg-popover ring-foreground/10 fixed z-50 min-w-44 rounded-lg p-1 text-sm shadow-md ring-1"
                style={{ left: menu.x, top: menu.y }}
              >
                {menu.actions.map((action, index) =>
                  action === "sep" ? (
                    <div key={index} className="bg-border/60 my-1 h-px" />
                  ) : (
                    <button
                      key={index}
                      type="button"
                      className="hover:bg-accent flex w-full items-center rounded-md px-2 py-1 text-left"
                      onPointerDown={(event) => {
                        event.preventDefault()
                        action.run()
                        setMenu(null)
                      }}
                    >
                      {action.label}
                    </button>
                  ),
                )}
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  )
}

export default SheetGrid
