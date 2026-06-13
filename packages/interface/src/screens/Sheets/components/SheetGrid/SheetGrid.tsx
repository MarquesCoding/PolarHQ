"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
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
import { toast } from "sonner"
import { Button } from "@polarhq/ui/components/button"
import { Input } from "@polarhq/ui/components/input"
import {
  type CellFormat,
  COLS,
  a1,
  clamp,
  colLabel,
  inBox,
  shiftFormula,
} from "@polarhq/interface/screens/Sheets/sheetModel"
import type { SheetController } from "@polarhq/interface/screens/Sheets/useSheet"
import InCellEditor, { type EditState } from "./InCellEditor"

const FONT_FAMILY = "ui-sans-serif, system-ui, -apple-system, sans-serif"
const BORDER_COLOR = "#64748b"
const numFmt = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 4 })

interface Action {
  label: string
  run: () => void
}

const SheetGrid = ({ sheet }: { sheet: SheetController }) => {
  const { t } = useTranslation("sheets")
  const ref = useRef<DataEditorRef>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const prevRefCells = useRef<Item[]>([])
  const editInputRef = useRef<HTMLInputElement | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [, setBoundsTick] = useState(0)
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

  useEffect(() => {
    const cells: Item[] = []
    for (const refBox of sheet.editingRefs)
      for (let r = refBox.box.r0; r <= refBox.box.r1; r += 1)
        for (let c = refBox.box.c0; c <= refBox.box.c1; c += 1) cells.push([c, r])
    const damage = [...prevRefCells.current, ...cells]
    prevRefCells.current = cells
    if (damage.length > 0 && damage.length < 5000)
      ref.current?.updateCells(damage.map((cell) => ({ cell })))
  }, [sheet.editingRefs])

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
    const cf = sheet.cfStyleAt(r, c)
    const bold = f.b || cf?.b
    const italic = f.i || cf?.i
    const themeOverride: Partial<Theme> = {}
    if (bold || italic || f.fs) {
      const parts = [italic ? "italic" : "", bold ? "bold" : "", `${(f.fs ?? 13) * z}px`].filter(
        Boolean,
      )
      themeOverride.baseFontStyle = parts.join(" ")
    }
    if (f.ff && f.ff !== "Default") themeOverride.fontFamily = f.ff
    const color = cf?.color ?? f.color
    const bg = cf?.bg ?? f.bg
    if (color) themeOverride.textDark = color
    if (bg) themeOverride.bgCell = bg
    const merge = sheet.mergeAnchorAt(r, c)
    return {
      kind: GridCellKind.Text,
      data: sheet.rawAt(r, c),
      displayData: sheet.display(r, c),
      allowOverlay: false,
      contentAlign: f.align,
      themeOverride: Object.keys(themeOverride).length > 0 ? themeOverride : undefined,
      span: merge && r === merge.r0 ? [merge.c0, merge.c1] : undefined,
    }
  }

  const drawCell: DrawCellCallback = (args, draw) => {
    draw()
    const { ctx, rect, col, row, theme: t } = args
    const f = sheet.fmtAt(row, col)
    const hasList = sheet.listOptionsAt(row, col) !== null
    const refs = sheet.editingRefs.filter((ref) => inBox(row, col, ref.box))
    if (!f.bd && !f.u && !f.s && !hasList && refs.length === 0) return
    ctx.save()
    ctx.beginPath()
    ctx.rect(rect.x, rect.y, rect.width, rect.height)
    ctx.clip()
    for (const refBox of refs) {
      ctx.fillStyle = `${refBox.color}1a`
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
      ctx.strokeStyle = refBox.color
      ctx.lineWidth = 2
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      if (row === refBox.box.r0) {
        ctx.moveTo(rect.x, rect.y + 1)
        ctx.lineTo(rect.x + rect.width, rect.y + 1)
      }
      if (row === refBox.box.r1) {
        ctx.moveTo(rect.x, rect.y + rect.height - 1)
        ctx.lineTo(rect.x + rect.width, rect.y + rect.height - 1)
      }
      if (col === refBox.box.c0) {
        ctx.moveTo(rect.x + 1, rect.y)
        ctx.lineTo(rect.x + 1, rect.y + rect.height)
      }
      if (col === refBox.box.c1) {
        ctx.moveTo(rect.x + rect.width - 1, rect.y)
        ctx.lineTo(rect.x + rect.width - 1, rect.y + rect.height)
      }
      ctx.stroke()
      ctx.setLineDash([])
    }
    if (hasList) {
      const cx = rect.x + rect.width - 11
      const cy = rect.y + rect.height / 2
      ctx.strokeStyle = t.textLight ?? "#94a3b8"
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(cx - 3, cy - 2)
      ctx.lineTo(cx, cy + 2)
      ctx.lineTo(cx + 3, cy - 2)
      ctx.stroke()
    }
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

  const extractRaw = (value: EditableGridCell): string | null => {
    if (value.kind === GridCellKind.Text || value.kind === GridCellKind.Number)
      return String(value.data ?? "")
    return null
  }

  const openEdit = (col: number, row: number, initial?: string) => {
    setEdit({ col, row, text: initial ?? sheet.rawAt(row, col) })
    sheet.setSel({ anchor: { r: row, c: col }, focus: { r: row, c: col } })
  }

  const finishEdit = (state: EditState, movement: readonly [number, number]) => {
    const trimmed = state.text.trim()
    const error = sheet.validateCell(state.row, state.col, trimmed)
    if (error) {
      toast.error(error)
      return false
    }
    sheet.setRaw(state.row, state.col, trimmed)
    sheet.setEditingFormula(null)
    const nc = clamp(state.col + movement[0], 0, COLS - 1)
    const nr = clamp(state.row + movement[1], 0, sheet.rows - 1)
    sheet.setSel({ anchor: { r: nr, c: nc }, focus: { r: nr, c: nc } })
    return true
  }

  const commitEdit = (movement: readonly [number, number]) => {
    if (edit && finishEdit(edit, movement)) setEdit(null)
  }

  const cancelEdit = () => {
    sheet.setEditingFormula(null)
    setEdit(null)
  }

  const isRefContext = (text: string): boolean => {
    if (!text.startsWith("=")) return false
    const last = text.replace(/\s+$/, "").slice(-1)
    return last === "" || "(,=+-*/^&<>:".includes(last)
  }

  const onCellEdited = (item: Item, value: EditableGridCell) => {
    const next = extractRaw(value)
    if (next === null) return
    const error = sheet.validateCell(item[1], item[0], next)
    if (error) {
      toast.error(error)
      return
    }
    sheet.setRaw(item[1], item[0], next)
  }

  const onCellsEdited = (edits: readonly { location: Item; value: EditableGridCell }[]) => {
    let rejected: string | null = null
    sheet.transact(() => {
      for (const { location, value } of edits) {
        const next = extractRaw(value)
        if (next === null) continue
        const error = sheet.validateCell(location[1], location[0], next)
        if (error) {
          rejected = error
          continue
        }
        sheet.setRaw(location[1], location[0], next)
      }
    })
    if (rejected) toast.error(rejected)
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
    if (edit) return
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
    } else if (!mod && (event.key === "Backspace" || event.key === "Delete")) {
      event.cancel()
      sheet.clearContents()
    } else if (!mod && !edit && event.key.length === 1) {
      event.cancel()
      openEdit(sheet.sel.focus.c, sheet.sel.focus.r, event.key)
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
    { label: t("sheetGrid.cut"), run: () => void sheet.cutSelection() },
    { label: t("sheetGrid.copy"), run: () => void sheet.copySelection() },
    { label: t("sheetGrid.paste"), run: () => void sheet.pasteSelection() },
    "sep",
    { label: t("sheetGrid.insertColumnLeft"), run: () => sheet.insertColumn("left") },
    { label: t("sheetGrid.insertColumnRight"), run: () => sheet.insertColumn("right") },
    { label: t("sheetGrid.deleteColumn"), run: () => sheet.deleteColumns() },
    { label: t("sheetGrid.clearColumn"), run: () => sheet.clearContents() },
    "sep",
    { label: t("sheetGrid.sortAToZ"), run: () => sheet.sortSelection("asc") },
    { label: t("sheetGrid.sortZToA"), run: () => sheet.sortSelection("desc") },
  ]
  const cellActions: Array<Action | "sep"> = [
    { label: t("sheetGrid.cut"), run: () => void sheet.cutSelection() },
    { label: t("sheetGrid.copy"), run: () => void sheet.copySelection() },
    { label: t("sheetGrid.paste"), run: () => void sheet.pasteSelection() },
    "sep",
    { label: t("sheetGrid.insertRowAbove"), run: () => sheet.insertRow("above") },
    { label: t("sheetGrid.insertRowBelow"), run: () => sheet.insertRow("below") },
    { label: t("sheetGrid.insertColumnLeft"), run: () => sheet.insertColumn("left") },
    { label: t("sheetGrid.insertColumnRight"), run: () => sheet.insertColumn("right") },
    "sep",
    { label: t("sheetGrid.deleteRow"), run: () => sheet.deleteRows() },
    { label: t("sheetGrid.deleteColumn"), run: () => sheet.deleteColumns() },
    { label: t("sheetGrid.clear"), run: () => sheet.clearContents() },
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
          onCellActivated={(cell) => openEdit(cell[0], cell[1])}
          onCellClicked={(cell, event) => {
            if (!edit) return
            if (isRefContext(edit.text)) {
              event.preventDefault()
              setEdit((cur) => (cur ? { ...cur, text: cur.text + a1(cell[1], cell[0]) } : cur))
              requestAnimationFrame(() => editInputRef.current?.focus())
            } else {
              commitEdit([0, 0])
              sheet.setSel({ anchor: { r: cell[1], c: cell[0] }, focus: { r: cell[1], c: cell[0] } })
            }
          }}
          onVisibleRegionChanged={() => {
            if (edit) setBoundsTick((value) => value + 1)
          }}
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

      {edit
        ? (() => {
            const b = ref.current?.getBounds(edit.col, edit.row)
            if (!b) return null
            return (
              <InCellEditor
                sheet={sheet}
                edit={edit}
                bounds={b}
                inputRef={editInputRef}
                onChange={(text) => setEdit((cur) => (cur ? { ...cur, text } : cur))}
                onCommit={commitEdit}
                onCancel={cancelEdit}
              />
            )
          })()
        : null}

      <div className="bg-card text-muted-foreground flex shrink-0 items-center gap-2 border-t px-3 py-1 text-sm">
        <Button variant="ghost" size="sm" className="text-primary" onClick={() => sheet.addRows(addN)}>
          {t("sheetGrid.add")}
        </Button>
        <Input
          type="number"
          value={addN}
          min={1}
          onChange={(event) => setAddN(Math.max(1, Number(event.target.value) || 1))}
          className="h-7 w-20"
        />
        {t("sheetGrid.moreRowsAtBottom")}
        {stats ? (
          <div className="ml-auto flex items-center gap-4 tabular-nums">
            {stats.numCount > 0 ? (
              <>
                <span>{t("sheetGrid.sum", { value: numFmt(stats.sum) })}</span>
                <span>{t("sheetGrid.avg", { value: numFmt(stats.avg) })}</span>
                <span>{t("sheetGrid.min", { value: numFmt(stats.min) })}</span>
                <span>{t("sheetGrid.max", { value: numFmt(stats.max) })}</span>
              </>
            ) : null}
            <span>{t("sheetGrid.count", { value: stats.count })}</span>
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
