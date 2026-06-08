/** Shared types, geometry and formatting helpers for the spreadsheet editor. */

export const COLS = 26
export const ROWS = 100
export const COL_W = 112
export const ROW_H = 28
export const HEAD_W = 48

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
  fmt?: "number" | "currency" | "percent"
  dec?: number
  ff?: string
  fs?: number
  bd?: CellBorder
}

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

export const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") {
    const error = value as { value?: string; message?: string }
    return error.value ?? error.message ?? "#ERR"
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE"
  return String(value)
}

export const formatNumber = (n: number, fmt: CellFormat["fmt"], dec?: number): string => {
  const fixed = (fallback: number) => {
    const places = dec ?? fallback
    return { minimumFractionDigits: places, maximumFractionDigits: places }
  }
  if (fmt === "currency")
    return n.toLocaleString(undefined, { style: "currency", currency: "USD", ...fixed(2) })
  if (fmt === "percent")
    return n.toLocaleString(undefined, { style: "percent", ...fixed(0) })
  if (fmt === "number") return n.toLocaleString(undefined, fixed(2))
  return String(n)
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
