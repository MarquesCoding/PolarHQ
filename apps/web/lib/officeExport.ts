/** Client-side export of editor content to Microsoft Office formats. Generators are lazy-loaded. */

const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const hex = (color: string | undefined, fallback: string): string =>
  (color ?? fallback).replace("#", "").slice(0, 6) || fallback

/** Spreadsheet rows → .xlsx (numbers and `=`-formulas preserved). */
export const exportSpreadsheet = async (rows: string[][], name: string): Promise<void> => {
  const XLSX = await import("xlsx")
  const aoa = rows.map((row) =>
    row.map((cell) => {
      if (cell === "" || cell.startsWith("=")) return null
      const numeric = /^-?\d*\.?\d+$/.test(cell) ? Number(cell) : NaN
      return Number.isNaN(numeric) ? cell : numeric
    }),
  )
  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.startsWith("=")) sheet[XLSX.utils.encode_cell({ r, c })] = { t: "n", f: cell.slice(1) }
    }),
  )
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1")
  const data = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  triggerDownload(
    new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${name}.xlsx`,
  )
}

/** TipTap HTML → .docx. */
export const exportDocument = async (html: string, name: string): Promise<void> => {
  const { asBlob } = await import("html-docx-js-typescript")
  const result = await asBlob(
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`,
  )
  const blob = result instanceof Blob ? result : new Blob([result as BlobPart])
  triggerDownload(blob, `${name}.docx`)
}

export interface ExportElement {
  type: "text" | "rect" | "ellipse" | "image"
  x: number
  y: number
  w: number
  h: number
  text?: string
  fill?: string
  color?: string
  src?: string
}

/** Slide elements → .pptx (16:9, 10in × 5.625in). */
export const exportPresentation = async (
  slides: Array<{ elements: ExportElement[] }>,
  name: string,
): Promise<void> => {
  const PptxGenJS = (await import("pptxgenjs")).default
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: "ORBIT_16x9", width: 10, height: 5.625 })
  pptx.layout = "ORBIT_16x9"
  for (const { elements } of slides) {
    const slide = pptx.addSlide()
    for (const element of elements) {
      const pos = { x: element.x * 10, y: element.y * 5.625, w: element.w * 10, h: element.h * 5.625 }
      if (element.type === "text") {
        slide.addText(element.text ?? "", { ...pos, fontSize: 16, color: hex(element.color, "363636") })
      } else if (element.type === "image" && element.src) {
        slide.addImage({ ...pos, path: element.src })
      } else {
        slide.addShape(element.type === "ellipse" ? "ellipse" : "rect", {
          ...pos,
          fill: { color: hex(element.fill, "3B82F6") },
        })
      }
    }
  }
  await pptx.writeFile({ fileName: `${name}.pptx` })
}
