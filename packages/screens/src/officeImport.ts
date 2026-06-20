import mammoth from "mammoth"
import * as XLSX from "xlsx"

/** Parsed payload stashed for an editor to apply on first load. */
export type ImportPayload =
  | { kind: "sheet"; name: string; cells: Record<string, string> }
  | { kind: "doc"; name: string; html: string }

const baseName = (file: File): string => file.name.replace(/\.[^.]+$/, "") || "Untitled"

const escapeHtml = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** Spreadsheets: .xlsx / .xls / .csv / .tsv / .ods → raw cell values (formulas preserved). */
export const parseSpreadsheet = async (file: File): Promise<ImportPayload> => {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined
  const cells: Record<string, string> = {}
  if (sheet && sheet["!ref"]) {
    const range = XLSX.utils.decode_range(sheet["!ref"])
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined
        if (!cell) continue
        const value = cell.f ? `=${cell.f}` : (cell.w ?? (cell.v != null ? String(cell.v) : ""))
        if (value !== "") cells[`${r}:${c}`] = value
      }
    }
  }
  return { kind: "sheet", name: baseName(file), cells }
}

/** Documents: .docx → HTML (via mammoth); .txt / .md → simple paragraphs. */
export const parseDocument = async (file: File): Promise<ImportPayload> => {
  if (/\.(txt|md|markdown)$/i.test(file.name)) {
    const text = await file.text()
    const html = text
      .split(/\n{2,}/)
      .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
      .join("")
    return { kind: "doc", name: baseName(file), html }
  }
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return { kind: "doc", name: baseName(file), html: result.value }
}
