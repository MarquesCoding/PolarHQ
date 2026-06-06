"use client"

import { type CSSProperties, type KeyboardEvent, Fragment, useEffect, useRef, useState } from "react"
import { HyperFormula } from "hyperformula"
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconBold,
  IconItalic,
} from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import type * as Y from "yjs"

interface CellFormat {
  b?: boolean
  i?: boolean
  color?: string
  bg?: string
  align?: "left" | "center" | "right"
  fmt?: "number" | "currency" | "percent"
}

const formatNumber = (n: number, fmt: CellFormat["fmt"]): string => {
  if (fmt === "currency") return n.toLocaleString(undefined, { style: "currency", currency: "USD" })
  if (fmt === "percent") return n.toLocaleString(undefined, { style: "percent", maximumFractionDigits: 2 })
  if (fmt === "number") return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return String(n)
}

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

const ColorButton = ({
  kind,
  value,
  onChange,
}: {
  kind: "text" | "fill"
  value: string
  onChange: (value: string) => void
}) => {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={kind === "text" ? "Text color" : "Fill color"}
      title={kind === "text" ? "Text color" : "Fill color"}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => ref.current?.click()}
    >
      {kind === "text" ? (
        <span className="text-sm font-semibold" style={{ color: value }}>
          A
        </span>
      ) : (
        <span className="size-3.5 rounded-sm border" style={{ backgroundColor: value }} />
      )}
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

/** A collaborative spreadsheet grid: Yjs-backed cells, HyperFormula evaluation, range + fill drag. */
const SheetGrid = ({ ydoc }: { ydoc: Y.Doc }) => {
  const cells = ydoc.getMap<string>("cells")
  const formats = ydoc.getMap<CellFormat>("formats")
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
    const fmtObserver = () => force((value) => value + 1)
    cells.observe(observer)
    formats.observe(fmtObserver)
    return () => {
      cells.unobserve(observer)
      formats.unobserve(fmtObserver)
      hf.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, formats])

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
  const fmtAt = (r: number, c: number): CellFormat => formats.get(cellKey(r, c)) ?? {}
  const display = (r: number, c: number): string => {
    const value = hf.getCellValue({ sheet, row: r, col: c })
    const fmt = fmtAt(r, c).fmt
    if (typeof value === "number" && fmt) return formatNumber(value, fmt)
    return formatValue(value)
  }
  const cellStyle = (r: number, c: number): CSSProperties => {
    const f = fmtAt(r, c)
    return {
      fontWeight: f.b ? 700 : undefined,
      fontStyle: f.i ? "italic" : undefined,
      color: f.color,
      backgroundColor: f.bg,
      textAlign: f.align,
    }
  }
  const setRaw = (r: number, c: number, value: string) => {
    if (value) cells.set(cellKey(r, c), value)
    else cells.delete(cellKey(r, c))
  }
  const applyFormat = (patch: CellFormat) => {
    const b = bounds(sel.anchor, sel.focus)
    ydoc.transact(() => {
      for (let r = b.r0; r <= b.r1; r += 1) {
        for (let c = b.c0; c <= b.c1; c += 1) {
          const next = { ...fmtAt(r, c), ...patch }
          if (Object.values(next).every((v) => v === undefined)) formats.delete(cellKey(r, c))
          else formats.set(cellKey(r, c), next)
        }
      }
    })
  }
  const toggle = (key: "b" | "i") => applyFormat({ [key]: !fmtAt(sel.focus.r, sel.focus.c)[key] })

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
  const focusFmt = fmtAt(sel.focus.r, sel.focus.c)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="bg-card/80 flex flex-wrap items-center gap-0.5 rounded-xl border px-2 py-1.5">
        <Button
          variant={focusFmt.b ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label="Bold"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => toggle("b")}
        >
          <IconBold className="size-4" />
        </Button>
        <Button
          variant={focusFmt.i ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label="Italic"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => toggle("i")}
        >
          <IconItalic className="size-4" />
        </Button>
        <ColorButton kind="text" value={focusFmt.color ?? "#000000"} onChange={(v) => applyFormat({ color: v })} />
        <ColorButton kind="fill" value={focusFmt.bg ?? "#ffffff"} onChange={(v) => applyFormat({ bg: v })} />
        <Separator orientation="vertical" className="mx-1 h-5" />
        {(["left", "center", "right"] as const).map((align) => {
          const Icon =
            align === "left" ? IconAlignLeft : align === "center" ? IconAlignCenter : IconAlignRight
          return (
            <Button
              key={align}
              variant={focusFmt.align === align ? "secondary" : "ghost"}
              size="icon-sm"
              aria-label={`Align ${align}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyFormat({ align })}
            >
              <Icon className="size-4" />
            </Button>
          )
        })}
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Select
          value={focusFmt.fmt ?? "general"}
          onValueChange={(value) =>
            applyFormat({ fmt: value === "general" ? undefined : (value as CellFormat["fmt"]) })
          }
        >
          <SelectTrigger className="h-8 w-28" onMouseDown={(event) => event.preventDefault()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="currency">Currency</SelectItem>
            <SelectItem value="percent">Percent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={onGridKey}
        className="scrollbar-slim border-border/60 min-h-0 flex-1 overflow-auto rounded-lg border outline-none"
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
                  style={cellStyle(r, c)}
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
    </div>
  )
}

export default SheetGrid
