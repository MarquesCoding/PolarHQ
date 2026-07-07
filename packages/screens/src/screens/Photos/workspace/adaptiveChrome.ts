/** Average perceived luminance (0–1) of an already-decoded, same-origin image element, sampled at low
 *  resolution. Returns null if the element isn't ready or the canvas can't be read. */
export const luminanceOfImage = (img: HTMLImageElement): number | null => {
  if (!img.complete || !img.naturalWidth) return null
  try {
    const canvas = document.createElement("canvas")
    const size = (canvas.width = canvas.height = 24)
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, size, size)
    const { data } = ctx.getImageData(0, 0, size, size)
    let sum = 0
    for (let i = 0; i < data.length; i += 4)
      sum += (0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!) / 255
    return sum / (data.length / 4)
  } catch {
    return null
  }
}

/** Luminance above this reads as "light content" → the chrome flips to dark. */
export const LIGHT_THRESHOLD = 0.6

/** Frosted floating-chrome classes that contrast the content behind them: dark chrome over light
 *  content, light chrome over dark content. `contentLight === null` falls back to dark. */
export const adaptiveChrome = (contentLight: boolean | null): string =>
  contentLight === false
    ? "border-black/10 bg-white/70 text-black backdrop-blur-xl"
    : "border-white/15 bg-black/45 text-white backdrop-blur-xl"
