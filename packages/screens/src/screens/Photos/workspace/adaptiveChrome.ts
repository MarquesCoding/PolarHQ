const lumaCache = new Map<string, number>()

/** Average perceived luminance (0–1) of an image URL, sampled at low resolution and cached per URL.
 *  Resolves to 0.5 (neutral) if the image can't be read (e.g. a cross-origin canvas taint). */
export const sampleLuminance = (url: string): Promise<number> => {
  const cached = lumaCache.get(url)
  if (cached !== undefined) return Promise.resolve(cached)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        const size = (canvas.width = canvas.height = 24)
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) return resolve(0.5)
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        let sum = 0
        for (let i = 0; i < data.length; i += 4)
          sum += (0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!) / 255
        const luma = sum / (data.length / 4)
        lumaCache.set(url, luma)
        resolve(luma)
      } catch {
        resolve(0.5)
      }
    }
    img.onerror = () => resolve(0.5)
    img.src = url
  })
}

/** Luminance above this reads as "light content" → the chrome flips to dark. */
export const LIGHT_THRESHOLD = 0.6

/** Frosted floating-chrome classes that contrast the content behind them: dark chrome over light
 *  content, light chrome over dark content. `contentLight === null` falls back to dark. */
export const adaptiveChrome = (contentLight: boolean | null): string =>
  contentLight === false
    ? "border-black/10 bg-white/70 text-black backdrop-blur-xl"
    : "border-white/15 bg-black/45 text-white backdrop-blur-xl"
