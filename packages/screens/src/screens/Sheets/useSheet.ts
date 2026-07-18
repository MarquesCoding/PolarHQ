import { type CSSProperties, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { HyperFormula } from "hyperformula"
import * as Y from "yjs"
import {
  type Box,
  type CellBorder,
  type CellFormat,
  type ChartDef,
  type CondRule,
  type DataRule,
  type Pos,
  COLS,
  COL_W,
  HEAD_W,
  ROW_H,
  bounds,
  cellKey,
  clamp,
  type RefBox,
  formatNumber,
  formatValue,
  inBox,
  lerpHex,
  parseFormulaRefs,
  shiftFormula,
  toCsv,
} from "./sheetModel"

export type BorderMode = "all" | "outer" | "inner" | "top" | "bottom" | "left" | "right" | "none"

const BORDER_COLOR = "#64748b"

/** Per-sheet Yjs map name. The first sheet ("0") keeps the legacy top-level names for
 *  backward compatibility with single-sheet documents; others are namespaced by id. */
const mapName = (base: string, id: string): string => (id === "0" ? base : `${base}:${id}`)

/**
 * The full spreadsheet controller: Yjs-backed cells/formats/merges, a HyperFormula
 * evaluation engine, selection + editing state, history, and every mutating operation.
 * Shared by the grid, toolbar, menu bar and formula bar so they all drive one model.
 */
export interface SheetController {
  cells: Y.Map<string>
  formats: Y.Map<CellFormat>
  transact: (fn: () => void) => void
  zoom: number
  setZoom: (zoom: number) => void
  gridlines: boolean
  setGridlines: (on: boolean) => void
  freezeCols: number
  setFreezeCols: (n: number) => void
  functionNames: string[]
  editingRefs: RefBox[]
  setEditingFormula: (formula: string | null) => void
  condFormats: CondRule[]
  cfStyleAt: (r: number, c: number) => Partial<CellFormat> | null
  addCondFormat: (rule: CondRule) => void
  removeCondFormat: (index: number) => void
  dataRules: DataRule[]
  dataRuleAt: (r: number, c: number) => DataRule | null
  listOptionsAt: (r: number, c: number) => string[] | null
  validateCell: (r: number, c: number, value: string) => string | null
  addDataRule: (rule: DataRule) => void
  removeDataRule: (index: number) => void
  charts: ChartDef[]
  addChart: (def: Omit<ChartDef, "id">) => void
  removeChart: (id: string) => void
  updateChart: (id: string, patch: Partial<ChartDef>) => void
  sheets: Array<{ id: string; name: string }>
  activeSheetId: string
  setActiveSheet: (id: string) => void
  addSheet: () => void
  deleteSheet: (id: string) => void
  renameSheet: (id: string, name: string) => void
  rows: number
  addRows: (n: number) => void

  rawAt: (r: number, c: number) => string
  fmtAt: (r: number, c: number) => CellFormat
  display: (r: number, c: number) => string
  valueAt: (r: number, c: number) => unknown
  cellStyle: (r: number, c: number) => CSSProperties
  focusFmt: CellFormat

  colW: (c: number) => number
  rowH: (r: number) => number
  colX: (c: number) => number
  rowY: (r: number) => number
  setColW: (c: number, px: number) => void
  setRowH: (r: number, px: number) => void

  sel: { anchor: Pos; focus: Pos }
  selBox: Box
  setSel: (sel: { anchor: Pos; focus: Pos }) => void
  selectOnly: (pos: Pos) => void
  selectAll: () => void
  extendTo: (pos: Pos) => void
  moveFocus: (dr: number, dc: number) => void

  edit: { pos: Pos; value: string } | null
  startEdit: (pos: Pos, initial?: string) => void
  setEditValue: (value: string) => void
  commitEdit: (next?: Pos) => void
  cancelEdit: () => void

  fillTo: Pos | null
  setFillTo: (pos: Pos | null) => void
  beginFill: () => void
  selectColumn: (c: number, extend?: boolean) => void
  selectRow: (r: number, extend?: boolean) => void
  dragRef: React.MutableRefObject<"select" | "fill" | "col" | "row" | null>

  setRaw: (r: number, c: number, value: string) => void
  applyFormat: (patch: CellFormat) => void
  toggle: (key: "b" | "i" | "u" | "s") => void
  clearFormatting: () => void
  setBorders: (mode: BorderMode) => void
  adjustDecimals: (delta: number) => void

  mergeAnchorAt: (r: number, c: number) => Box | null
  isCovered: (r: number, c: number) => boolean
  mergeSelection: () => void
  unmergeSelection: () => void
  isSelectionMerged: boolean

  insertRow: (where: "above" | "below") => void
  deleteRows: () => void
  insertColumn: (where: "left" | "right") => void
  deleteColumns: () => void
  sortSelection: (dir: "asc" | "desc") => void
  clearContents: () => void
  copySelection: () => Promise<void>
  cutSelection: () => Promise<void>
  pasteSelection: () => Promise<void>
  copiedBox: Box | null

  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean

  downloadCsv: (filename: string) => void

  gridRef: React.RefObject<HTMLDivElement | null>
  onGridKey: (event: KeyboardEvent) => void
  onInputKey: (event: KeyboardEvent<HTMLInputElement>) => void
}

export const useSheet = (ydoc: Y.Doc): SheetController => {
  const sheetOrder = ydoc.getArray<string>("sheetOrder")
  const sheetNames = ydoc.getMap<string>("sheetNames")
  const meta = ydoc.getMap<number>("meta")

  const [activeId, setActiveId] = useState("0")
  const [sheetVersion, setSheetVersion] = useState(0)
  const [editingFormula, setEditingFormula] = useState<string | null>(null)
  const [, force] = useState(0)
  const rerender = () => force((value) => value + 1)

  const editingRefs = useMemo(
    () => (editingFormula ? parseFormulaRefs(editingFormula) : []),
    [editingFormula],
  )

  const cells = ydoc.getMap<string>(mapName("cells", activeId))
  const formats = ydoc.getMap<CellFormat>(mapName("formats", activeId))
  const merges = ydoc.getMap<Box>(mapName("merges", activeId))
  const colWidths = ydoc.getMap<number>(mapName("colW", activeId))
  const rowHeights = ydoc.getMap<number>(mapName("rowH", activeId))
  const condArr = ydoc.getArray<CondRule>(
    activeId === "0" ? "condFormat" : `condFormat:${activeId}`,
  )
  const condFormats = condArr.toArray()
  const dataArr = ydoc.getArray<DataRule>(activeId === "0" ? "dataRule" : `dataRule:${activeId}`)
  const dataRules = dataArr.toArray()
  const chartsArr = ydoc.getArray<ChartDef>(activeId === "0" ? "charts" : `charts:${activeId}`)
  const charts = chartsArr.toArray()

  const sheets =
    sheetOrder.length > 0
      ? sheetOrder.toArray().map((id) => ({ id, name: sheetNames.get(id) ?? id }))
      : [{ id: "0", name: "Sheet1" }]

  const [sel, setSel] = useState<{ anchor: Pos; focus: Pos }>({
    anchor: { r: 0, c: 0 },
    focus: { r: 0, c: 0 },
  })
  const [edit, setEdit] = useState<{ pos: Pos; value: string } | null>(null)
  const [fillTo, setFillTo] = useState<Pos | null>(null)
  const [zoom, setZoom] = useState(100)
  const [gridlines, setGridlines] = useState(true)
  const [rowCount, setRowCount] = useState(1000)
  const [copiedBox, setCopiedBox] = useState<Box | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<"select" | "fill" | "col" | "row" | null>(null)
  const undoRef = useRef<Y.UndoManager | null>(null)

  const [engine, setEngine] = useState<{ hf: HyperFormula; idToHf: Map<string, number> } | null>(
    null,
  )
  const hf = engine?.hf
  const sheet = engine?.idToHf.get(activeId) ?? 0

  useEffect(() => {
    if (sheetOrder.length === 0) {
      ydoc.transact(() => {
        sheetOrder.push(["0"])
        sheetNames.set("0", "Sheet1")
      })
    }
    const bump = () => setSheetVersion((value) => value + 1)
    sheetOrder.observe(bump)
    sheetNames.observe(bump)
    return () => {
      sheetOrder.unobserve(bump)
      sheetNames.unobserve(bump)
    }
  }, [ydoc, sheetOrder, sheetNames])

  useEffect(() => {
    const instance = HyperFormula.buildEmpty({ licenseKey: "gpl-v3" })
    const ids = sheetOrder.length > 0 ? sheetOrder.toArray() : ["0"]
    const idToHf = new Map<string, number>()
    const subs: Array<{ map: Y.Map<string>; fn: (event: Y.YMapEvent<string>) => void }> = []
    for (const id of ids) {
      const hfId = instance.getSheetId(instance.addSheet(sheetNames.get(id) ?? `Sheet${id}`))!
      idToHf.set(id, hfId)
      const cellMap = ydoc.getMap<string>(mapName("cells", id))
      cellMap.forEach((raw, key) => {
        const [r, c] = key.split(":").map(Number)
        instance.setCellContents({ sheet: hfId, row: r!, col: c! }, raw)
      })
      const fn = (event: Y.YMapEvent<string>) => {
        event.keysChanged.forEach((key) => {
          const [r, c] = key.split(":").map(Number)
          instance.setCellContents({ sheet: hfId, row: r!, col: c! }, cellMap.get(key) ?? null)
        })
        rerender()
      }
      cellMap.observe(fn)
      subs.push({ map: cellMap, fn })
    }
    setEngine({ hf: instance, idToHf })
    return () => {
      subs.forEach(({ map, fn }) => map.unobserve(fn))
      instance.destroy()
      setEngine(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ydoc, sheetVersion])

  useEffect(() => {
    const fmtObserver = () => rerender()
    formats.observe(fmtObserver)
    merges.observe(fmtObserver)
    colWidths.observe(fmtObserver)
    rowHeights.observe(fmtObserver)
    meta.observe(fmtObserver)
    condArr.observe(fmtObserver)
    dataArr.observe(fmtObserver)
    chartsArr.observe(fmtObserver)
    return () => {
      formats.unobserve(fmtObserver)
      merges.unobserve(fmtObserver)
      colWidths.unobserve(fmtObserver)
      rowHeights.unobserve(fmtObserver)
      meta.unobserve(fmtObserver)
      condArr.unobserve(fmtObserver)
      dataArr.unobserve(fmtObserver)
      chartsArr.unobserve(fmtObserver)
    }
  }, [formats, merges, colWidths, rowHeights, meta, condArr, dataArr, chartsArr])

  useEffect(() => {
    const manager = new Y.UndoManager([cells, formats, merges, colWidths, rowHeights], {
      captureTimeout: 250,
    })
    undoRef.current = manager
    const sync = () => {
      setCanUndo(manager.undoStack.length > 0)
      setCanRedo(manager.redoStack.length > 0)
    }
    manager.on("stack-item-added", sync)
    manager.on("stack-item-popped", sync)
    manager.on("stack-cleared", sync)
    return () => {
      manager.destroy()
      undoRef.current = null
    }
  }, [cells, formats, merges, colWidths, rowHeights])

  const rawAt = (r: number, c: number): string => cells.get(cellKey(r, c)) ?? ""
  const fmtAt = (r: number, c: number): CellFormat => formats.get(cellKey(r, c)) ?? {}

  const colW = (c: number): number => colWidths.get(String(c)) ?? COL_W
  const rowH = (r: number): number => rowHeights.get(String(r)) ?? ROW_H
  const colX = (c: number): number => {
    let x = HEAD_W
    for (let i = 0; i < c; i += 1) x += colW(i)
    return x
  }
  const rowY = (r: number): number => {
    let y = ROW_H
    for (let i = 0; i < r; i += 1) y += rowH(i)
    return y
  }
  const setColW = (c: number, px: number) => colWidths.set(String(c), Math.max(40, Math.round(px)))
  const setRowH = (r: number, px: number) => rowHeights.set(String(r), Math.max(20, Math.round(px)))
  const addRows = (n: number) => setRowCount((current) => Math.min(50000, current + Math.max(1, n)))

  const display = (r: number, c: number): string => {
    const f = fmtAt(r, c)
    if (f.fmt === "text" || !hf) return rawAt(r, c)
    const value = hf.getCellValue({ sheet, row: r, col: c })
    if (typeof value === "number" && (f.fmt || f.dec != null)) return formatNumber(value, f.fmt, f.dec)
    return formatValue(value)
  }

  const valueAt = (r: number, c: number): unknown =>
    hf ? hf.getCellValue({ sheet, row: r, col: c }) : rawAt(r, c)

  const freezeCols = meta.get("freezeCols") ?? 0
  const setFreezeCols = (n: number) => meta.set("freezeCols", Math.max(0, Math.min(COLS - 1, n)))
  const functionNames = useMemo(() => {
    if (!hf) return []
    try {
      return hf.getRegisteredFunctionNames().slice().sort()
    } catch {
      return []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hf])

  const addSheet = () => {
    const id = String(Date.now())
    const used = new Set(sheets.map((s) => s.name))
    let n = sheets.length + 1
    while (used.has(`Sheet${n}`)) n += 1
    ydoc.transact(() => {
      sheetOrder.push([id])
      sheetNames.set(id, `Sheet${n}`)
    })
    setActiveId(id)
    setSel({ anchor: { r: 0, c: 0 }, focus: { r: 0, c: 0 } })
  }
  const deleteSheet = (id: string) => {
    if (sheetOrder.length <= 1) return
    const order = sheetOrder.toArray()
    const idx = order.indexOf(id)
    ydoc.transact(() => {
      if (idx >= 0) sheetOrder.delete(idx, 1)
      sheetNames.delete(id)
      for (const base of ["cells", "formats", "merges", "colW", "rowH"])
        ydoc.getMap(mapName(base, id)).clear()
    })
    if (activeId === id) setActiveId(order.filter((x) => x !== id)[0] ?? "0")
  }
  const renameSheet = (id: string, name: string) => {
    const trimmed = name.trim()
    if (trimmed) sheetNames.set(id, trimmed)
  }
  const setActiveSheet = (id: string) => {
    setActiveId(id)
    setSel({ anchor: { r: 0, c: 0 }, focus: { r: 0, c: 0 } })
  }

  const cfScaleStats = useMemo(
    () =>
      condFormats.map((rule) => {
        if (rule.type !== "scale") return null
        const b = rule.range
        if ((b.r1 - b.r0 + 1) * (b.c1 - b.c0 + 1) > 5000) return null
        let min = Infinity
        let max = -Infinity
        for (let r = b.r0; r <= b.r1; r += 1)
          for (let c = b.c0; c <= b.c1; c += 1) {
            const v = valueAt(r, c)
            if (typeof v === "number" && Number.isFinite(v)) {
              min = Math.min(min, v)
              max = Math.max(max, v)
            }
          }
        return min <= max ? { min, max } : null
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [condFormats, sheetVersion, hf, sheet],
  )

  const cfStyleAt = (r: number, c: number): Partial<CellFormat> | null => {
    let result: Partial<CellFormat> | null = null
    condFormats.forEach((rule, i) => {
      if (!inBox(r, c, rule.range)) return
      const v = valueAt(r, c)
      if (rule.type === "scale") {
        const stats = cfScaleStats[i]
        const num = typeof v === "number" ? v : Number(v)
        if (stats && Number.isFinite(num) && stats.max > stats.min) {
          const t = (num - stats.min) / (stats.max - stats.min)
          result = {
            ...(result ?? {}),
            bg: lerpHex(rule.minColor ?? "#fee2e2", rule.maxColor ?? "#bbf7d0", t),
          }
        }
        return
      }
      let match = false
      if (rule.type === "contains") {
        const text = typeof v === "object" ? "" : String(v ?? "")
        match = (rule.v1 ?? "") !== "" && text.toLowerCase().includes((rule.v1 ?? "").toLowerCase())
      } else {
        const num = typeof v === "number" ? v : Number(v)
        const n1 = Number(rule.v1)
        const n2 = Number(rule.v2)
        if (Number.isFinite(num)) {
          if (rule.type === "gt") match = num > n1
          else if (rule.type === "lt") match = num < n1
          else if (rule.type === "eq") match = num === n1
          else if (rule.type === "between") match = num >= Math.min(n1, n2) && num <= Math.max(n1, n2)
        }
      }
      if (match) result = { ...(result ?? {}), bg: rule.bg, color: rule.color, b: rule.b }
    })
    return result
  }
  const addCondFormat = (rule: CondRule) => condArr.push([rule])
  const removeCondFormat = (index: number) => condArr.delete(index, 1)

  const dataRuleAt = (r: number, c: number): DataRule | null =>
    dataRules.find((rule) => inBox(r, c, rule.range)) ?? null
  const listOptionsAt = (r: number, c: number): string[] | null => {
    const rule = dataRuleAt(r, c)
    if (!rule || rule.kind !== "list") return null
    return rule.spec.split(",").map((s) => s.trim()).filter(Boolean)
  }
  const validateCell = (r: number, c: number, value: string): string | null => {
    const rule = dataRuleAt(r, c)
    if (!rule || value === "" || value.startsWith("=")) return null
    if (rule.kind === "number") {
      const [lo, hi] = rule.spec.split(",").map((s) => Number(s.trim()))
      const n = Number(value)
      if (!Number.isFinite(n)) return "Enter a number"
      if (Number.isFinite(lo!) && n < lo!) return `Must be ≥ ${lo}`
      if (Number.isFinite(hi!) && n > hi!) return `Must be ≤ ${hi}`
      return null
    }
    const opts = rule.spec.split(",").map((s) => s.trim()).filter(Boolean)
    return opts.includes(value) ? null : `Must be one of: ${opts.join(", ")}`
  }
  const addDataRule = (rule: DataRule) => dataArr.push([rule])
  const removeDataRule = (index: number) => dataArr.delete(index, 1)

  const addChart = (def: Omit<ChartDef, "id">) => chartsArr.push([{ ...def, id: String(Date.now()) }])
  const removeChart = (id: string) => {
    const idx = charts.findIndex((chart) => chart.id === id)
    if (idx >= 0) chartsArr.delete(idx, 1)
  }
  const updateChart = (id: string, patch: Partial<ChartDef>) => {
    const idx = charts.findIndex((chart) => chart.id === id)
    if (idx < 0) return
    const current = chartsArr.get(idx)
    ydoc.transact(() => {
      chartsArr.delete(idx, 1)
      chartsArr.insert(idx, [{ ...current, ...patch }])
    })
  }

  const cellStyle = (r: number, c: number): CSSProperties => {
    const f = fmtAt(r, c)
    const decoration = [f.u ? "underline" : "", f.s ? "line-through" : ""].filter(Boolean).join(" ")
    const shadows: string[] = []
    if (f.bd?.t) shadows.push(`inset 0 1px 0 0 ${BORDER_COLOR}`)
    if (f.bd?.b) shadows.push(`inset 0 -1px 0 0 ${BORDER_COLOR}`)
    if (f.bd?.l) shadows.push(`inset 1px 0 0 0 ${BORDER_COLOR}`)
    if (f.bd?.r) shadows.push(`inset -1px 0 0 0 ${BORDER_COLOR}`)
    return {
      fontWeight: f.b ? 700 : undefined,
      fontStyle: f.i ? "italic" : undefined,
      textDecoration: decoration || undefined,
      color: f.color,
      backgroundColor: f.bg,
      textAlign: f.align,
      fontFamily: f.ff && f.ff !== "Default" ? f.ff : undefined,
      fontSize: f.fs ? `${f.fs}px` : undefined,
      boxShadow: shadows.length ? shadows.join(", ") : undefined,
    }
  }

  const selBox = bounds(sel.anchor, sel.focus)
  const focusFmt = fmtAt(sel.focus.r, sel.focus.c)

  const setRaw = (r: number, c: number, value: string) => {
    if (value) cells.set(cellKey(r, c), value)
    else cells.delete(cellKey(r, c))
  }

  const applyFormat = (patch: CellFormat) => {
    ydoc.transact(() => {
      for (let r = selBox.r0; r <= selBox.r1; r += 1) {
        for (let c = selBox.c0; c <= selBox.c1; c += 1) {
          const next = { ...fmtAt(r, c), ...patch }
          if (Object.values(next).every((v) => v === undefined)) formats.delete(cellKey(r, c))
          else formats.set(cellKey(r, c), next)
        }
      }
    })
  }

  const toggle = (key: "b" | "i" | "u" | "s") => applyFormat({ [key]: !focusFmt[key] })

  const clearFormatting = () => {
    ydoc.transact(() => {
      for (let r = selBox.r0; r <= selBox.r1; r += 1)
        for (let c = selBox.c0; c <= selBox.c1; c += 1) formats.delete(cellKey(r, c))
    })
  }

  const adjustDecimals = (delta: number) => {
    const current = focusFmt.dec ?? (focusFmt.fmt === "percent" ? 0 : 2)
    applyFormat({ dec: clamp(current + delta, 0, 10) })
  }

  const setBorders = (mode: BorderMode) => {
    ydoc.transact(() => {
      for (let r = selBox.r0; r <= selBox.r1; r += 1) {
        for (let c = selBox.c0; c <= selBox.c1; c += 1) {
          const base = fmtAt(r, c)
          let bd: CellBorder | undefined
          if (mode === "none") bd = undefined
          else if (mode === "all")
            bd = { t: true, b: true, l: true, r: true }
          else if (mode === "outer")
            bd = {
              t: r === selBox.r0,
              b: r === selBox.r1,
              l: c === selBox.c0,
              r: c === selBox.c1,
            }
          else if (mode === "inner")
            bd = { b: r < selBox.r1, r: c < selBox.c1, t: false, l: false }
          else
            bd = {
              t: mode === "top" && r === selBox.r0,
              b: mode === "bottom" && r === selBox.r1,
              l: mode === "left" && c === selBox.c0,
              r: mode === "right" && c === selBox.c1,
            }
          const next = { ...base, bd }
          if (!bd || Object.values(bd).every((v) => !v)) delete next.bd
          if (Object.values(next).every((v) => v === undefined)) formats.delete(cellKey(r, c))
          else formats.set(cellKey(r, c), next)
        }
      }
    })
  }

  const mergeList = (): Box[] => Array.from(merges.values())
  const mergeAnchorAt = (r: number, c: number): Box | null => merges.get(cellKey(r, c)) ?? null
  const isCovered = (r: number, c: number): boolean =>
    mergeList().some((box) => inBox(r, c, box) && !(box.r0 === r && box.c0 === c))
  const isSelectionMerged = useMemo(
    () => mergeList().some((box) => box.r0 === selBox.r0 && box.c0 === selBox.c0 && box.r1 === selBox.r1 && box.c1 === selBox.c1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selBox.r0, selBox.c0, selBox.r1, selBox.c1, merges],
  )

  const removeMergesIn = (box: Box) => {
    for (const [key, existing] of Array.from(merges.entries())) {
      const overlap = existing.r0 <= box.r1 && existing.r1 >= box.r0 && existing.c0 <= box.c1 && existing.c1 >= box.c0
      if (overlap) merges.delete(key)
    }
  }

  const mergeSelection = () => {
    if (selBox.r0 === selBox.r1 && selBox.c0 === selBox.c1) return
    ydoc.transact(() => {
      removeMergesIn(selBox)
      for (let r = selBox.r0; r <= selBox.r1; r += 1)
        for (let c = selBox.c0; c <= selBox.c1; c += 1)
          if (!(r === selBox.r0 && c === selBox.c0)) cells.delete(cellKey(r, c))
      merges.set(cellKey(selBox.r0, selBox.c0), { ...selBox })
    })
  }

  const unmergeSelection = () => {
    ydoc.transact(() => removeMergesIn(selBox))
  }

  const focusGrid = () => gridRef.current?.focus()
  const selectOnly = (pos: Pos) => setSel({ anchor: pos, focus: pos })
  const selectAll = () => setSel({ anchor: { r: 0, c: 0 }, focus: { r: rowCount - 1, c: COLS - 1 } })
  const extendTo = (pos: Pos) => setSel((s) => ({ ...s, focus: pos }))
  const selectColumn = (c: number, extend = false) =>
    setSel((s) => ({
      anchor: { r: rowCount - 1, c: extend ? s.anchor.c : c },
      focus: { r: 0, c },
    }))
  const selectRow = (r: number, extend = false) =>
    setSel((s) => ({
      anchor: { r: extend ? s.anchor.r : r, c: COLS - 1 },
      focus: { r, c: 0 },
    }))

  const startEdit = (pos: Pos, initial?: string) =>
    setEdit({ pos, value: initial ?? rawAt(pos.r, pos.c) })
  const setEditValue = (value: string) => setEdit((e) => (e ? { ...e, value } : e))
  const cancelEdit = () => {
    setEdit(null)
    focusGrid()
  }
  const commitEdit = (next?: Pos) => {
    setEdit((current) => {
      if (current) setRaw(current.pos.r, current.pos.c, current.value.trim())
      return null
    })
    if (next) selectOnly(next)
    focusGrid()
  }

  const moveFocus = (dr: number, dc: number) =>
    setSel((s) => {
      const pos = { r: clamp(s.focus.r + dr, 0, rowCount - 1), c: clamp(s.focus.c + dc, 0, COLS - 1) }
      return { anchor: pos, focus: pos }
    })

  const beginFill = () => {
    dragRef.current = "fill"
    setFillTo(sel.focus)
  }

  const performFill = (to: Pos) => {
    const orig = bounds(sel.anchor, sel.focus)
    const lo = Math.min(orig.r0, to.r)
    const hi = Math.max(orig.r1, to.r)
    const height = orig.r1 - orig.r0 + 1
    ydoc.transact(() => {
      for (let r = lo; r <= hi; r += 1) {
        for (let c = orig.c0; c <= orig.c1; c += 1) {
          if (inBox(r, c, orig)) continue
          const sourceRow = orig.r0 + ((((r - orig.r0) % height) + height) % height)
          const raw = rawAt(sourceRow, c)
          setRaw(r, c, raw.startsWith("=") ? shiftFormula(raw, r - sourceRow, 0) : raw)
        }
      }
    })
    setSel({ anchor: { r: orig.r0, c: orig.c0 }, focus: { r: hi, c: orig.c1 } })
  }

  useEffect(() => {
    const onUp = () => {
      if (dragRef.current === "fill" && fillTo) performFill(fillTo)
      dragRef.current = null
      setFillTo(null)
    }
    window.addEventListener("pointerup", onUp)
    return () => window.removeEventListener("pointerup", onUp)
  })

  const clearContents = () => {
    ydoc.transact(() => {
      for (let r = selBox.r0; r <= selBox.r1; r += 1)
        for (let c = selBox.c0; c <= selBox.c1; c += 1) setRaw(r, c, "")
    })
  }

  const copySelection = async () => {
    const rows: string[] = []
    for (let r = selBox.r0; r <= selBox.r1; r += 1) {
      const cols: string[] = []
      for (let c = selBox.c0; c <= selBox.c1; c += 1) cols.push(rawAt(r, c))
      rows.push(cols.join("\t"))
    }
    try {
      await navigator.clipboard.writeText(rows.join("\n"))
    } catch {
      /* clipboard unavailable */
    }
    setCopiedBox({ ...selBox })
  }

  const pasteSelection = async () => {
    let text = ""
    try {
      text = await navigator.clipboard.readText()
    } catch {
      return
    }
    const start = sel.focus
    ydoc.transact(() => {
      text.split(/\r?\n/).forEach((line, i) =>
        line.split("\t").forEach((value, j) => setRaw(start.r + i, start.c + j, value)),
      )
    })
  }

  const cutSelection = async () => {
    await copySelection()
    clearContents()
  }

  const remap = (shift: (r: number, c: number) => Pos | null) => {
    ydoc.transact(() => {
      for (const map of [cells, formats] as unknown as Array<Y.Map<unknown>>) {
        const entries = Array.from(map.entries())
        map.clear()
        for (const [key, value] of entries) {
          const [r, c] = key.split(":").map(Number)
          const next = shift(r!, c!)
          if (next && next.r >= 0 && next.r < rowCount && next.c >= 0 && next.c < COLS)
            map.set(cellKey(next.r, next.c), value)
        }
      }
      const mergeEntries = Array.from(merges.values())
      merges.clear()
      for (const box of mergeEntries) {
        const tl = shift(box.r0, box.c0)
        const br = shift(box.r1, box.c1)
        if (tl && br && tl.r <= br.r && tl.c <= br.c && br.r < rowCount && br.c < COLS)
          merges.set(cellKey(tl.r, tl.c), { r0: tl.r, c0: tl.c, r1: br.r, c1: br.c })
      }
    })
  }

  const insertRow = (where: "above" | "below") => {
    const at = where === "above" ? selBox.r0 : selBox.r1 + 1
    remap((r, c) => ({ r: r >= at ? r + 1 : r, c }))
  }
  const deleteRows = () => {
    const count = selBox.r1 - selBox.r0 + 1
    remap((r, c) => (r >= selBox.r0 && r <= selBox.r1 ? null : { r: r > selBox.r1 ? r - count : r, c }))
  }
  const insertColumn = (where: "left" | "right") => {
    const at = where === "left" ? selBox.c0 : selBox.c1 + 1
    remap((r, c) => ({ r, c: c >= at ? c + 1 : c }))
  }
  const deleteColumns = () => {
    const count = selBox.c1 - selBox.c0 + 1
    remap((r, c) => (c >= selBox.c0 && c <= selBox.c1 ? null : { r, c: c > selBox.c1 ? c - count : c }))
  }

  const sortSelection = (dir: "asc" | "desc") => {
    const rows: Array<{ values: string[]; fmts: Array<CellFormat | undefined>; key: string }> = []
    for (let r = selBox.r0; r <= selBox.r1; r += 1) {
      const values: string[] = []
      const fmts: Array<CellFormat | undefined> = []
      for (let c = selBox.c0; c <= selBox.c1; c += 1) {
        values.push(rawAt(r, c))
        fmts.push(formats.get(cellKey(r, c)))
      }
      rows.push({ values, fmts, key: values[0] ?? "" })
    }
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" })
    rows.sort((a, b) => (dir === "asc" ? collator.compare(a.key, b.key) : collator.compare(b.key, a.key)))
    ydoc.transact(() => {
      rows.forEach((row, i) => {
        const r = selBox.r0 + i
        row.values.forEach((value, j) => setRaw(r, selBox.c0 + j, value))
        row.fmts.forEach((fmt, j) => {
          if (fmt) formats.set(cellKey(r, selBox.c0 + j), fmt)
          else formats.delete(cellKey(r, selBox.c0 + j))
        })
      })
    })
  }

  const undo = () => undoRef.current?.undo()
  const redo = () => undoRef.current?.redo()

  const downloadCsv = (filename: string) => {
    let maxRow = 0
    let maxCol = 0
    cells.forEach((_v, key) => {
      const [r, c] = key.split(":").map(Number)
      maxRow = Math.max(maxRow, r!)
      maxCol = Math.max(maxCol, c!)
    })
    const csv = toCsv(rawAt, maxRow, maxCol)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const onGridKey = (event: KeyboardEvent) => {
    if (edit) return
    const { key } = event
    const mod = event.metaKey || event.ctrlKey
    if (mod && (key === "z" || key === "Z")) {
      if (event.shiftKey) redo()
      else undo()
    } else if (mod && (key === "y" || key === "Y")) {
      redo()
    } else if (mod && (key === "a" || key === "A")) {
      selectAll()
    } else if (mod && (key === "b" || key === "B")) {
      toggle("b")
    } else if (mod && (key === "i" || key === "I")) {
      toggle("i")
    } else if (mod && (key === "u" || key === "U")) {
      toggle("u")
    } else if (mod && (key === "c" || key === "C")) {
      void copySelection()
    } else if (mod && (key === "x" || key === "X")) {
      void cutSelection()
    } else if (mod && (key === "v" || key === "V")) {
      void pasteSelection()
    } else if (key === "Escape") {
      setCopiedBox(null)
    } else if (key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight" || key === "Tab") {
      const dr = key === "ArrowUp" ? -1 : key === "ArrowDown" ? 1 : 0
      const dc = key === "ArrowLeft" ? -1 : key === "ArrowRight" || key === "Tab" ? 1 : 0
      if (event.shiftKey && key !== "Tab")
        extendTo({ r: clamp(sel.focus.r + dr, 0, rowCount - 1), c: clamp(sel.focus.c + dc, 0, COLS - 1) })
      else moveFocus(dr, dc)
    } else if (key === "Enter") startEdit(sel.focus)
    else if (key === "Backspace" || key === "Delete") clearContents()
    else if (key.length === 1 && !mod) {
      startEdit(sel.focus, key)
      return
    } else return
    event.preventDefault()
  }

  const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      commitEdit({ r: clamp(sel.focus.r + 1, 0, rowCount - 1), c: sel.focus.c })
    } else if (event.key === "Tab") {
      event.preventDefault()
      commitEdit({ r: sel.focus.r, c: clamp(sel.focus.c + 1, 0, COLS - 1) })
    } else if (event.key === "Escape") {
      event.preventDefault()
      cancelEdit()
    }
  }

  return {
    cells,
    formats,
    transact: (fn: () => void) => ydoc.transact(fn),
    zoom,
    setZoom,
    gridlines,
    setGridlines,
    freezeCols,
    setFreezeCols,
    functionNames,
    editingRefs,
    setEditingFormula,
    condFormats,
    cfStyleAt,
    addCondFormat,
    removeCondFormat,
    dataRules,
    dataRuleAt,
    listOptionsAt,
    validateCell,
    addDataRule,
    removeDataRule,
    charts,
    addChart,
    removeChart,
    updateChart,
    sheets,
    activeSheetId: activeId,
    setActiveSheet,
    addSheet,
    deleteSheet,
    renameSheet,
    rows: rowCount,
    addRows,
    rawAt,
    fmtAt,
    display,
    valueAt,
    cellStyle,
    focusFmt,
    colW,
    rowH,
    colX,
    rowY,
    setColW,
    setRowH,
    sel,
    selBox,
    setSel,
    selectOnly,
    selectAll,
    extendTo,
    moveFocus,
    edit,
    startEdit,
    setEditValue,
    commitEdit,
    cancelEdit,
    fillTo,
    setFillTo,
    beginFill,
    selectColumn,
    selectRow,
    dragRef,
    setRaw,
    applyFormat,
    toggle,
    clearFormatting,
    setBorders,
    adjustDecimals,
    mergeAnchorAt,
    isCovered,
    mergeSelection,
    unmergeSelection,
    isSelectionMerged,
    insertRow,
    deleteRows,
    insertColumn,
    deleteColumns,
    sortSelection,
    clearContents,
    copySelection,
    cutSelection,
    pasteSelection,
    copiedBox,
    undo,
    redo,
    canUndo,
    canRedo,
    downloadCsv,
    gridRef,
    onGridKey,
    onInputKey,
  }
}
