const MAX_DIMENSION = 400
const QUALITY = 0.8

export interface ImageAnalysis {
  /** Downscaled JPEG thumbnail bytes. */
  thumbnail: Uint8Array
  /** The image's natural dimensions (needed for the justified grid layout). */
  width: number
  height: number
}

/**
 * Decode an image once to produce a downscaled JPEG thumbnail and read its natural
 * dimensions — both in the browser, so an E2E server never sees the pixels.
 */
export const analyzeImage = (file: File, maxDimension = MAX_DIMENSION): Promise<ImageAnalysis> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not load image"))
    }
    image.onload = () => {
      const width = image.width
      const height = image.height
      const scale = Math.min(1, maxDimension / Math.max(width, height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error("No canvas context"))
        return
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (!blob) {
            reject(new Error("Could not encode thumbnail"))
            return
          }
          blob
            .arrayBuffer()
            .then((buffer) => resolve({ thumbnail: new Uint8Array(buffer), width, height }))
        },
        "image/jpeg",
        QUALITY,
      )
    }
    image.src = url
  })

/** Generate a downscaled JPEG thumbnail for an image file, in the browser. */
export const generateImageThumbnail = (file: File): Promise<Uint8Array> =>
  analyzeImage(file).then((r) => r.thumbnail)
