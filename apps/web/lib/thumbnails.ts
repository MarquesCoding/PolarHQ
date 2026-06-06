const MAX_DIMENSION = 400
const QUALITY = 0.8

/** Generate a downscaled JPEG thumbnail for an image file, in the browser. */
export const generateImageThumbnail = (file: File): Promise<Uint8Array> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not load image"))
    }
    image.onload = () => {
      const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(image.width * scale))
      canvas.height = Math.max(1, Math.round(image.height * scale))
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
          blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)))
        },
        "image/jpeg",
        QUALITY,
      )
    }
    image.src = url
  })
