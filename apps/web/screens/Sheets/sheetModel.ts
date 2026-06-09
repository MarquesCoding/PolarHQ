/** Shared types, geometry and formatting helpers for the spreadsheet editor. */

export const COLS = 26
export const ROWS = 100
export const COL_W = 112
export const ROW_H = 28
export const HEAD_W = 48

export type NumberFormat =
  | "number"
  | "percent"
  | "scientific"
  | "accounting"
  | "financial"
  | "currency"
  | "currency_rounded"
  | "date"
  | "time"
  | "datetime"
  | "duration"
  | "text"

/** Number-format options for the "123" menu, grouped like Google Sheets. */
export const NUMBER_FORMAT_GROUPS: Array<
  Array<{ label: string; fmt: NumberFormat | undefined; example: string }>
> = [
  [
    { label: "Automatic", fmt: undefined, example: "" },
    { label: "Plain text", fmt: "text", example: "" },
  ],
  [
    { label: "Number", fmt: "number", example: "1,000.12" },
    { label: "Percent", fmt: "percent", example: "10.12%" },
    { label: "Scientific", fmt: "scientific", example: "1.01E+03" },
  ],
  [
    { label: "Accounting", fmt: "accounting", example: "$ (1,000.12)" },
    { label: "Financial", fmt: "financial", example: "(1,000.12)" },
    { label: "Currency", fmt: "currency", example: "$1,000.12" },
    { label: "Currency rounded", fmt: "currency_rounded", example: "$1,000" },
  ],
  [
    { label: "Date", fmt: "date", example: "9/26/2008" },
    { label: "Time", fmt: "time", example: "3:59:00 PM" },
    { label: "Date time", fmt: "datetime", example: "9/26/2008 15:59:00" },
    { label: "Duration", fmt: "duration", example: "24:01:00" },
  ],
]

export interface CellBorder {
  t?: boolean
  r?: boolean
  b?: boolean
  l?: boolean
}

export interface CellFormat {
  b?: boolean
  i?: boolean
  u?: boolean
  s?: boolean
  color?: string
  bg?: string
  align?: "left" | "center" | "right"
  valign?: "top" | "middle" | "bottom"
  fmt?: NumberFormat
  dec?: number
  ff?: string
  fs?: number
  bd?: CellBorder
}

export type CondType = "gt" | "lt" | "eq" | "between" | "contains" | "scale"

export interface CondRule {
  range: Box
  type: CondType
  v1?: string
  v2?: string
  bg?: string
  color?: string
  b?: boolean
  minColor?: string
  maxColor?: string
}

export interface DataRule {
  range: Box
  kind: "list" | "number"
  /** Comma-separated allowed values for a list, or "min,max" bounds for a number. */
  spec: string
}

export interface ChartDef {
  id: string
  type: "bar" | "line" | "pie"
  range: Box
  title: string
}

export const CHART_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
]

export interface Pos {
  r: number
  c: number
}

export interface Box {
  r0: number
  c0: number
  r1: number
  c1: number
}

export const FONTS = [
  "Default",
  "Arial",
  "Georgia",
  "Verdana",
  "Times New Roman",
  "Courier New",
  "Roboto",
] as const

export const FONT_SIZES = [6, 7, 8, 9, 10, 11, 12, 14, 18, 24, 36] as const

export const ZOOM_LEVELS = [50, 75, 90, 100, 125, 150, 200] as const

export const colLabel = (c: number): string => numToCol(c)
export const cellKey = (r: number, c: number): string => `${r}:${c}`
export const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

export const colToNum = (s: string): number => {
  let n = 0
  for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}

export const numToCol = (n: number): string => {
  let s = ""
  let v = n + 1
  while (v > 0) {
    s = String.fromCharCode(65 + ((v - 1) % 26)) + s
    v = Math.floor((v - 1) / 26)
  }
  return s
}

/** An A1-style reference for a single cell, e.g. (0,0) -> "A1". */
export const a1 = (r: number, c: number): string => `${numToCol(c)}${r + 1}`

/** An A1 range label for a box, collapsing single cells, e.g. "A1" or "A1:C4". */
export const a1Range = (box: Box): string => {
  const start = a1(box.r0, box.c0)
  const end = a1(box.r1, box.c1)
  return start === end ? start : `${start}:${end}`
}

export const bounds = (a: Pos, b: Pos): Box => ({
  r0: Math.min(a.r, b.r),
  c0: Math.min(a.c, b.c),
  r1: Math.max(a.r, b.r),
  c1: Math.max(a.c, b.c),
})

export const inBox = (r: number, c: number, b: Box): boolean =>
  r >= b.r0 && r <= b.r1 && c >= b.c0 && c <= b.c1

export const REF_COLORS = ["#f59e0b", "#a855f7", "#2563eb", "#16a34a", "#db2777", "#0891b2"]

export interface RefBox {
  box: Box
  color: string
  /** Character span of the reference token within the formula, for token coloring. */
  start: number
  end: number
}

/** Parse cell/range references (e.g. A1, H9:I19) from a formula being edited, each
 *  assigned a stable color. Single-letter columns + a token boundary avoid matching
 *  function names like SUMX2MY2. */
export const parseFormulaRefs = (formula: string): RefBox[] => {
  if (!formula.startsWith("=")) return []
  const re = /(?<![A-Za-z0-9$])\$?([A-Za-z])\$?(\d+)(?::\$?([A-Za-z])\$?(\d+))?/g
  const out: RefBox[] = []
  let match: RegExpExecArray | null
  let i = 0
  while ((match = re.exec(formula)) !== null) {
    const start = { c: colToNum(match[1]!), r: parseInt(match[2]!, 10) - 1 }
    const end = match[3] ? { c: colToNum(match[3]), r: parseInt(match[4]!, 10) - 1 } : start
    if (start.c < 0 || start.c >= COLS || end.c < 0 || end.c >= COLS) continue
    out.push({
      box: bounds(start, end),
      color: REF_COLORS[i % REF_COLORS.length]!,
      start: match.index,
      end: match.index + match[0].length,
    })
    i += 1
  }
  return out
}

/** Shift relative A1 references in a formula by (dr, dc); honors $ absolute markers. */
export const shiftFormula = (formula: string, dr: number, dc: number): string =>
  formula.replace(
    /(\$?)([A-Za-z]+)(\$?)(\d+)(?!\()/g,
    (_m, ad: string, col: string, ar: string, row: string) => {
      const c = ad ? colToNum(col) : Math.max(0, colToNum(col) + dc)
      const r = ar ? parseInt(row, 10) - 1 : Math.max(0, parseInt(row, 10) - 1 + dr)
      return `${ad}${numToCol(c)}${ar}${r + 1}`
    },
  )

/** Linear interpolate between two #rrggbb colors (t in 0..1). */
export const lerpHex = (a: string, b: string, t: number): string => {
  const parse = (hex: string): [number, number, number] => {
    const h = hex.replace("#", "")
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  const clampT = Math.max(0, Math.min(1, t))
  const mix = (x: number, y: number) => Math.round(x + (y - x) * clampT)
  const hex = (n: number) => n.toString(16).padStart(2, "0")
  return `#${hex(mix(ar, br))}${hex(mix(ag, bg))}${hex(mix(ab, bb))}`
}

export const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") {
    const error = value as { value?: string; message?: string }
    return error.value ?? error.message ?? "#ERR"
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE"
  return String(value)
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30)
const serialToDate = (serial: number): Date => new Date(EXCEL_EPOCH + Math.round(serial * 86_400_000))

export const formatNumber = (n: number, fmt: CellFormat["fmt"], dec?: number): string => {
  const places = (fallback: number) => {
    const d = dec ?? fallback
    return { minimumFractionDigits: d, maximumFractionDigits: d }
  }
  const currency = (d: number) =>
    n.toLocaleString(undefined, { style: "currency", currency: "USD", ...places(d) })
  switch (fmt) {
    case "number":
      return n.toLocaleString(undefined, places(2))
    case "percent":
      return n.toLocaleString(undefined, { style: "percent", ...places(2) })
    case "scientific":
      return n
        .toExponential(dec ?? 2)
        .toUpperCase()
        .replace(/E([+-])(\d)$/, "E$10$2")
    case "currency":
      return currency(2)
    case "currency_rounded":
      return currency(0)
    case "accounting": {
      const body = Math.abs(n).toLocaleString(undefined, {
        style: "currency",
        currency: "USD",
        ...places(2),
      })
      return n < 0 ? `(${body})` : body
    }
    case "financial": {
      const body = Math.abs(n).toLocaleString(undefined, places(2))
      return n < 0 ? `(${body})` : body
    }
    case "date":
      return serialToDate(n).toLocaleDateString()
    case "time":
      return serialToDate(n).toLocaleTimeString()
    case "datetime": {
      const d = serialToDate(n)
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
    }
    case "duration": {
      const total = Math.round(Math.abs(n) * 86_400)
      const h = Math.floor(total / 3600)
      const m = Math.floor((total % 3600) / 60)
      const s = total % 60
      const pad = (x: number) => String(x).padStart(2, "0")
      return `${n < 0 ? "-" : ""}${h}:${pad(m)}:${pad(s)}`
    }
    default:
      return String(n)
  }
}

/** Build a CSV string from a raw-value lookup over the populated range. */
export const toCsv = (rawAt: (r: number, c: number) => string, maxRow: number, maxCol: number): string => {
  const lines: string[] = []
  for (let r = 0; r <= maxRow; r += 1) {
    const cells: string[] = []
    for (let c = 0; c <= maxCol; c += 1) {
      const value = rawAt(r, c)
      cells.push(/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
    }
    lines.push(cells.join(","))
  }
  return lines.join("\n")
}
