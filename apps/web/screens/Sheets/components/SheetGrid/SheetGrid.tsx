"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  CompactSelection,
  DataEditor,
  type DataEditorRef,
  type DrawCellCallback,
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
import { type CellFormat, COLS, colLabel, shiftFormula } from "@pages/Sheets/sheetModel"
import type { SheetController } from "@pages/Sheets/useSheet"

const FONT_FAMILY = "ui-sans-serif, system-ui, -apple-system, sans-serif"
const BORDER_COLOR = "#64748b"
const numFmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 4 })

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

  const cellFont = (f: CellFormat): string => {
    const style = `${f.i ? "italic " : ""}${f.b ? "bold " : ""}`
    const size = (f.fs ?? 13) * z
    const family = f.ff && f.ff !== "Default" ? f.ff : FONT_FAMILY
    return `${style}${size}px ${family}`
  }

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
    borderColor: sheet.gridlines ? "rgba(148, 163, 184, 0.16)" : "transparent",
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
    const themeOverride: Partial<Theme> = {}
    if (f.b || f.i || f.fs) {
      const parts = [f.i ? "italic" : "", f.b ? "bold" : "", `${(f.fs ?? 13) * z}px`].filter(Boolean)
      themeOverride.baseFontStyle = parts.join(" ")
    }
    if (f.ff && f.ff !== "Default") themeOverride.fontFamily = f.ff
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

  const drawCell: DrawCellCallback = (args, draw) => {
    draw()
    const { ctx, rect, col, row, theme: t } = args
    const f = sheet.fmtAt(row, col)
    if (!f.bd && !f.u && !f.s) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(rect.x, rect.y, rect.width, rect.height)
    ctx.clip()
    if (f.bd) {
      ctx.strokeStyle = BORDER_COLOR
      ctx.lineWidth = 1
      ctx.beginPath()
      if (f.bd.t) {
        ctx.moveTo(rect.x, rect.y + 0.5)
        ctx.lineTo(rect.x + rect.width, rect.y + 0.5)
      }
      if (f.bd.b) {
        ctx.moveTo(rect.x, rect.y + rect.height - 0.5)
        ctx.lineTo(rect.x + rect.width, rect.y + rect.height - 0.5)
      }
      if (f.bd.l) {
        ctx.moveTo(rect.x + 0.5, rect.y)
        ctx.lineTo(rect.x + 0.5, rect.y + rect.height)
      }
      if (f.bd.r) {
        ctx.moveTo(rect.x + rect.width - 0.5, rect.y)
        ctx.lineTo(rect.x + rect.width - 0.5, rect.y + rect.height)
      }
      ctx.stroke()
    }
    if (f.u || f.s) {
      const text = sheet.display(row, col)
      if (text) {
        ctx.font = cellFont(f)
        const w = ctx.measureText(text).width
        const pad = t.cellHorizontalPadding ?? 8
        const align = f.align ?? "left"
        let tx = rect.x + pad
        if (align === "right") tx = rect.x + rect.width - pad - w
        else if (align === "center") tx = rect.x + (rect.width - w) / 2
        const size = (f.fs ?? 13) * z
        const midY = rect.y + rect.height / 2
        ctx.strokeStyle = f.color ?? t.textDark
        ctx.lineWidth = Math.max(1, Math.round(z))
        if (f.s) {
          const y = Math.round(midY) + 0.5
          ctx.beginPath()
          ctx.moveTo(tx, y)
          ctx.lineTo(tx + w, y)
          ctx.stroke()
        }
        if (f.u) {
          const y = Math.round(midY + size * 0.4) + 0.5
          ctx.beginPath()
          ctx.moveTo(tx, y)
          ctx.lineTo(tx + w, y)
          ctx.stroke()
        }
      }
    }
    ctx.restore()
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
    } else if (mod && (event.key === "c" || event.key === "C")) {
      event.cancel()
      void sheet.copySelection()
    } else if (mod && (event.key === "x" || event.key === "X")) {
      event.cancel()
      void sheet.cutSelection()
    }
  }

  const onPaste = (target: Item, values: readonly (readonly string[])[]): boolean => {
    const [tc, tr] = target
    const src = sheet.copiedBox
    const dr = src ? tr - src.r0 : 0
    const dc = src ? tc - src.c0 : 0
    sheet.transact(() => {
      values.forEach((rowValues, i) =>
        rowValues.forEach((value, j) => {
          const shifted = src && value.startsWith("=") ? shiftFormula(value, dr, dc) : value
          sheet.setRaw(tr + i, tc + j, shifted)
        }),
      )
    })
    return false
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

  const stats = useMemo(() => {
    const b = sheet.selBox
    const area = (b.r1 - b.r0 + 1) * (b.c1 - b.c0 + 1)
    if (area <= 1 || area > 100000) return null
    let count = 0
    let numCount = 0
    let sum = 0
    let min = Infinity
    let max = -Infinity
    for (let r = b.r0; r <= b.r1; r += 1) {
      for (let c = b.c0; c <= b.c1; c += 1) {
        const v = sheet.valueAt(r, c)
        if (v === "" || v === null || v === undefined) continue
        count += 1
        if (typeof v === "number" && Number.isFinite(v)) {
          numCount += 1
          sum += v
          min = Math.min(min, v)
          max = Math.max(max, v)
        }
      }
    }
    if (count === 0) return null
    return { count, numCount, sum, avg: numCount ? sum / numCount : 0, min, max }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet.selBox.r0, sheet.selBox.c0, sheet.selBox.r1, sheet.selBox.c1, sheet])

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onPointerDownCapture={(event) => {
        pointer.current = { x: event.clientX, y: event.clientY }
      }}
    >
      <div className="min-h-0 flex-1">
        <DataEditor
          key={sheet.activeSheetId}
          ref={ref}
          theme={theme}
          columns={columns}
          rows={sheet.rows}
          rowHeight={(row) => sheet.rowH(row) * z}
          headerHeight={Math.round(30 * z)}
          freezeColumns={sheet.freezeCols}
          getCellContent={getCellContent}
          drawCell={drawCell}
          verticalBorder={sheet.gridlines}
          onCellEdited={onCellEdited}
          onCellsEdited={onCellsEdited}
          onKeyDown={onKeyDown}
          getCellsForSelection
          onPaste={onPaste}
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
        {stats ? (
          <div className="ml-auto flex items-center gap-4 tabular-nums">
            {stats.numCount > 0 ? (
              <>
                <span>Sum: {numFmt(stats.sum)}</span>
                <span>Avg: {numFmt(stats.avg)}</span>
                <span>Min: {numFmt(stats.min)}</span>
                <span>Max: {numFmt(stats.max)}</span>
              </>
            ) : null}
            <span>Count: {stats.count}</span>
          </div>
        ) : null}
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
