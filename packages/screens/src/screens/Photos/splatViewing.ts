import { fetchDecryptedSplat } from "@workspace/core/photosE2e"
import { fetchCachedOriginal } from "@pages/Photos/components/Lightbox/originalCache"

export interface SplatSource {
  url: string
  name: string
  light?: boolean
}

/** Average perceived brightness of an image blob (downsampled) — drives the splat viewer's adaptive
 *  chrome (dark pills over a bright splat, light over a dark one). `true` when the photo is bright. */
export const averageLight = async (blob: Blob): Promise<boolean> => {
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 10
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) {
      bitmap.close()
      return true
    }
    ctx.drawImage(bitmap, 0, 0, 10, 10)
    bitmap.close()
    const { data } = ctx.getImageData(0, 0, 10, 10)
    let sum = 0
    for (let i = 0; i < data.length; i += 4)
      sum += (0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!) / 255
    return sum / (data.length / 4) > 0.6
  } catch {
    return true
  }
}

/** Fetch + decrypt a photo's stored splat and derive its adaptive-chrome brightness from the source
 *  photo, ready to hand to the splat viewer. Returns null when the asset has no stored splat. */
export const loadStoredSplat = async (
  assetId: string,
  mimeType: string,
  name: string,
): Promise<SplatSource | null> => {
  const [url, sourceUrl] = await Promise.all([
    fetchDecryptedSplat(assetId),
    fetchCachedOriginal(assetId, mimeType),
  ])
  if (!url) return null
  const light = sourceUrl
    ? await averageLight(await fetch(sourceUrl).then((response) => response.blob()))
    : undefined
  return { url, name: `${name.replace(/\.[^.]+$/, "")}.ply`, light }
}
