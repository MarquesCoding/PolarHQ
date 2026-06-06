"use client"

import { type KeyboardEvent, Fragment, useEffect, useRef, useState } from "react"
import { HyperFormula } from "hyperformula"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import type * as Y from "yjs"

const COLS = 26
const ROWS = 100
const COL_W = 112
const ROW_H = 28
const HEAD_W = 48

const colLabel = (c: number): string => String.fromCharCode(65 + c)
const cellKey = (r: number, c: number): string => `${r}:${c}`
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))
const colToNum = (s: string): number => {
  let n = 0
  for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}
const numToCol = (n: number): string => {
  let s = ""
  let v = n + 1
  while (v > 0) {
    s = String.fromCharCode(65 + ((v - 1) % 26)) + s
    v = Math.floor((v - 1) / 26)
  }
  return s
}

/** Shift relative A1 references in a formula by (dr, dc); honors $ absolute markers. */
const shiftFormula = (formula: string, dr: number, dc: number): string =>
  formula.replace(/(\$?)([A-Za-z]+)(\$?)(\d+)(?!\()/g, (_m, ad: string, col: string, ar: string, row: string) => {
    const c = ad ? colToNum(col) : Math.max(0, colToNum(col) + dc)
    const r = ar ? parseInt(row, 10) - 1 : Math.max(0, parseInt(row, 10) - 1 + dr)
    return `${ad}${numToCol(c)}${ar}${r + 1}`
  })

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") {
    const error = value as { value?: string; message?: string }
    return error.value ?? error.message ?? "#ERR"
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE"
  return String(value)
}

interface Pos {
  r: number
  c: number
}
interface Box {
  r0: number
  c0: number
  r1: number
  c1: number
}
const bounds = (a: Pos, b: Pos): Box => ({
  r0: Math.min(a.r, b.r),
  c0: Math.min(a.c, b.c),
  r1: Math.max(a.r, b.r),
  c1: Math.max(a.c, b.c),
})
const inBox = (r: number, c: number, b: Box): boolean =>
  r >= b.r0 && r <= b.r1 && c >= b.c0 && c <= b.c1

/** A collaborative spreadsheet grid: Yjs-backed cells, HyperFormula evaluation, range + fill drag. */
const SheetGrid = ({ ydoc }: { ydoc: Y.Doc }) => {
  const cells = ydoc.getMap<string>("cells")
  const [, force] = useState(0)
  const [sel, setSel] = useState<{ anchor: Pos; focus: Pos }>({
    anchor: { r: 0, c: 0 },
    focus: { r: 0, c: 0 },
  })
  const [edit, setEdit] = useState<{ pos: Pos; value: string } | null>(null)
  const [fillTo, setFillTo] = useState<Pos | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<"select" | "fill" | null>(null)

  const [{ hf, sheet }] = useState(() => {
    const engine = HyperFormula.buildEmpty({ licenseKey: "gpl-v3" })
    const sheetId = engine.getSheetId(engine.addSheet("Sheet1"))!
    cells.forEach((raw, key) => {
      const [r, c] = key.split(":").map(Number)
      engine.setCellContents({ sheet: sheetId, row: r!, col: c! }, raw)
    })
    return { hf: engine, sheet: sheetId }
  })

  useEffect(() => {
    const observer = (event: Y.YMapEvent<string>) => {
      event.keysChanged.forEach((key) => {
        const [r, c] = key.split(":").map(Number)
        hf.setCellContents({ sheet, row: r!, col: c! }, cells.get(key) ?? null)
      })
      force((value) => value + 1)
    }
    cells.observe(observer)
    return () => {
      cells.unobserve(observer)
      hf.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells])

  useEffect(() => {
    const onUp = () => {
      if (dragRef.current === "fill" && fillTo) performFill(fillTo)
      dragRef.current = null
      setFillTo(null)
    }
    window.addEventListener("pointerup", onUp)
    return () => window.removeEventListener("pointerup", onUp)
  })

  const rawAt = (r: number, c: number): string => cells.get(cellKey(r, c)) ?? ""
  const display = (r: number, c: number): string =>
    formatValue(hf.getCellValue({ sheet, row: r, col: c }))
  const setRaw = (r: number, c: number, value: string) => {
    if (value) cells.set(cellKey(r, c), value)
    else cells.delete(cellKey(r, c))
  }

  const focusGrid = () => gridRef.current?.focus()
  const selectOnly = (pos: Pos) => setSel({ anchor: pos, focus: pos })
  const startEdit = (pos: Pos, initial?: string) =>
    setEdit({ pos, value: initial ?? rawAt(pos.r, pos.c) })
  const commitEdit = (next?: Pos) => {
    if (edit) setRaw(edit.pos.r, edit.pos.c, edit.value.trim())
    setEdit(null)
    if (next) selectOnly(next)
    focusGrid()
  }
  const moveFocus = (dr: number, dc: number) =>
    setSel((s) => {
      const pos = { r: clamp(s.focus.r + dr, 0, ROWS - 1), c: clamp(s.focus.c + dc, 0, COLS - 1) }
      return { anchor: pos, focus: pos }
    })

  const performFill = (to: Pos) => {
    const src = sel.anchor
    const raw = rawAt(src.r, src.c)
    const orig = bounds(sel.anchor, sel.focus)
    const box = bounds(sel.anchor, to)
    ydoc.transact(() => {
      for (let r = box.r0; r <= box.r1; r += 1) {
        for (let c = box.c0; c <= box.c1; c += 1) {
          if (inBox(r, c, orig)) continue
          setRaw(r, c, raw.startsWith("=") ? shiftFormula(raw, r - src.r, c - src.c) : raw)
        }
      }
    })
    setSel({ anchor: src, focus: { r: box.r1, c: box.c1 } })
  }

  const onGridKey = (event: KeyboardEvent) => {
    if (edit) return
    const { key } = event
    if (key === "ArrowUp") moveFocus(-1, 0)
    else if (key === "ArrowDown") moveFocus(1, 0)
    else if (key === "ArrowLeft") moveFocus(0, -1)
    else if (key === "ArrowRight" || key === "Tab") moveFocus(0, 1)
    else if (key === "Enter") startEdit(sel.focus)
    else if (key === "Backspace" || key === "Delete") {
      const b = bounds(sel.anchor, sel.focus)
      ydoc.transact(() => {
        for (let r = b.r0; r <= b.r1; r += 1) for (let c = b.c0; c <= b.c1; c += 1) setRaw(r, c, "")
      })
    } else if (key.length === 1 && !event.metaKey && !event.ctrlKey) {
      startEdit(sel.focus, key)
      return
    } else return
    event.preventDefault()
  }

  const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      commitEdit({ r: clamp(sel.focus.r + 1, 0, ROWS - 1), c: sel.focus.c })
    } else if (event.key === "Tab") {
      event.preventDefault()
      commitEdit({ r: sel.focus.r, c: clamp(sel.focus.c + 1, 0, COLS - 1) })
    } else if (event.key === "Escape") {
      event.preventDefault()
      setEdit(null)
      focusGrid()
    }
  }

  const selBox = bounds(sel.anchor, sel.focus)
  const fillBox = fillTo ? bounds(sel.anchor, fillTo) : null
  const outline = (b: Box) => ({
    left: HEAD_W + b.c0 * COL_W,
    top: ROW_H + b.r0 * ROW_H,
    width: (b.c1 - b.c0 + 1) * COL_W,
    height: (b.r1 - b.r0 + 1) * ROW_H,
  })
  const o = outline(selBox)

  return (
    <div
      ref={gridRef}
      tabIndex={0}
      onKeyDown={onGridKey}
      className="scrollbar-slim min-h-0 flex-1 overflow-auto outline-none"
    >
      <div
        className="relative inline-grid text-sm"
        style={{ gridTemplateColumns: `${HEAD_W}px repeat(${COLS}, ${COL_W}px)` }}
      >
        <div className="bg-muted border-border/60 sticky top-0 left-0 z-20 h-7 border-r border-b" />
        {Array.from({ length: COLS }).map((_, c) => (
          <div
            key={c}
            className={cn(
              "bg-muted text-muted-foreground border-border/60 sticky top-0 z-10 flex h-7 items-center justify-center border-r border-b font-medium",
              c >= selBox.c0 && c <= selBox.c1 && "text-foreground bg-primary/10",
            )}
          >
            {colLabel(c)}
          </div>
        ))}

        {Array.from({ length: ROWS }).map((_, r) => (
          <Fragment key={r}>
            <div
              className={cn(
                "bg-muted text-muted-foreground border-border/60 sticky left-0 z-10 flex h-7 items-center justify-center border-r border-b text-xs",
                r >= selBox.r0 && r <= selBox.r1 && "text-foreground bg-primary/10",
              )}
            >
              {r + 1}
            </div>
            {Array.from({ length: COLS }).map((_, c) => {
              const selected = inBox(r, c, selBox)
              const editing = edit?.pos.r === r && edit.pos.c === c
              return (
                <div
                  key={c}
                  onPointerDown={() => {
                    dragRef.current = "select"
                    selectOnly({ r, c })
                    focusGrid()
                  }}
                  onPointerEnter={() => {
                    if (dragRef.current === "select") setSel((s) => ({ ...s, focus: { r, c } }))
                    else if (dragRef.current === "fill") setFillTo({ r, c })
                  }}
                  onDoubleClick={() => startEdit({ r, c })}
                  className={cn(
                    "border-border/40 h-7 cursor-cell truncate border-r border-b px-1.5 leading-7",
                    selected && !editing && "bg-primary/5",
                  )}
                >
                  {editing ? (
                    <Input
                      autoFocus
                      value={edit.value}
                      onChange={(event) => setEdit({ pos: { r, c }, value: event.target.value })}
                      onKeyDown={onInputKey}
                      onBlur={() => commitEdit()}
                      className="h-7 rounded-none border-none px-0 shadow-none focus-visible:ring-0"
                    />
                  ) : (
                    display(r, c)
                  )}
                </div>
              )
            })}
          </Fragment>
        ))}

        {/* selection outline */}
        <div
          className="border-primary pointer-events-none absolute z-30 border-2"
          style={o}
        />
        {/* fill preview */}
        {fillBox ? (
          <div
            className="border-primary/60 pointer-events-none absolute z-30 border-2 border-dashed"
            style={outline(fillBox)}
          />
        ) : null}
        {/* fill handle */}
        <div
          onPointerDown={(event) => {
            event.stopPropagation()
            dragRef.current = "fill"
            setFillTo(sel.focus)
          }}
          className="border-background bg-primary absolute z-40 size-2 cursor-crosshair border"
          style={{ left: o.left + o.width - 4, top: o.top + o.height - 4 }}
        />
      </div>
    </div>
  )
}

export default SheetGrid
