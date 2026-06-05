import type { EditorView } from "@tiptap/pm/view"

const MAX_DIMENSION = 1600
const JPEG_QUALITY = 0.85

/** Image files from a drag/clipboard payload. */
export const imageFilesFrom = (data: DataTransfer | null): File[] =>
  data ? Array.from(data.files).filter((file) => file.type.startsWith("image/")) : []

/**
 * Read an image file to a data URL, downscaling oversized images so the
 * document snapshot stays a reasonable size (images live inside the doc).
 */
const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const source = reader.result as string
      const image = new Image()
      image.onerror = () => resolve(source)
      image.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height))
        if (scale === 1) {
          resolve(source)
          return
        }
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(source)
          return
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        const type = file.type === "image/png" ? "image/png" : "image/jpeg"
        resolve(canvas.toDataURL(type, JPEG_QUALITY))
      }
      image.src = source
    }
    reader.readAsDataURL(file)
  })

/** Insert image files into the editor at `pos` (or the cursor), as embedded data URLs. */
export const insertImageFiles = async (
  view: EditorView,
  files: File[],
  pos?: number,
): Promise<void> => {
  const imageType = view.state.schema.nodes.image
  if (!imageType) return
  let target = pos
  for (const file of files) {
    const src = await fileToDataUrl(file)
    const at = target ?? view.state.selection.from
    const node = imageType.create({ src })
    view.dispatch(view.state.tr.insert(Math.min(at, view.state.doc.content.size), node))
    target = undefined
  }
}
