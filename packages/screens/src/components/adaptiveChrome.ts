import { type RefObject, useEffect, useState } from "react"

// Hysteresis band: flip to "light content" only above HIGH, back to "dark content" only below LOW, so
// a value hovering near the midpoint doesn't chatter between the two.
const LIGHT_HIGH = 0.62
const LIGHT_LOW = 0.5

type Probe = {
  ref: RefObject<HTMLElement | null>
  set: (v: boolean | null) => void
  last: boolean | null
  lastSig: string
}
const probes = new Set<Probe>()
let focusedImg: HTMLImageElement | null = null
let raf = 0

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

// One reusable offscreen canvas for all luminance sampling — avoids allocating a canvas per probe per
// frame (was ~60 allocations/sec while a viewer is open).
const SAMPLE = 10
let sampleCtx: CanvasRenderingContext2D | null = null
const getSampleCtx = (): CanvasRenderingContext2D | null => {
  if (!sampleCtx) {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = SAMPLE
    sampleCtx = canvas.getContext("2d", { willReadFrequently: true })
  }
  return sampleCtx
}

/** Perceived luminance (0–1) of the focused image region behind a screen rect, mapping through the
 *  image's on-screen box (post transform) and its object-contain letterbox. Null if unavailable or
 *  the rect sits over the backdrop rather than the image. */
const luminanceBehind = (rect: DOMRect, box: DOMRect): number | null => {
  const img = focusedImg
  if (!img || !img.complete || !img.naturalWidth) return null
  if (!box.width || !box.height) return null
  const imgAspect = img.naturalWidth / img.naturalHeight
  const boxAspect = box.width / box.height
  let cw = box.width
  let ch = box.height
  let cx = box.left
  let cy = box.top
  if (imgAspect > boxAspect) {
    ch = box.width / imgAspect
    cy = box.top + (box.height - ch) / 2
  } else {
    cw = box.height * imgAspect
    cx = box.left + (box.width - cw) / 2
  }
  const nx0 = clamp01((rect.left - cx) / cw)
  const nx1 = clamp01((rect.right - cx) / cw)
  const ny0 = clamp01((rect.top - cy) / ch)
  const ny1 = clamp01((rect.bottom - cy) / ch)
  if (nx1 - nx0 < 0.005 || ny1 - ny0 < 0.005) return null
  try {
    const ctx = getSampleCtx()
    if (!ctx) return null
    ctx.drawImage(
      img,
      nx0 * img.naturalWidth,
      ny0 * img.naturalHeight,
      (nx1 - nx0) * img.naturalWidth,
      (ny1 - ny0) * img.naturalHeight,
      0,
      0,
      SAMPLE,
      SAMPLE,
    )
    const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE)
    let sum = 0
    for (let i = 0; i < data.length; i += 4)
      sum += (0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!) / 255
    return sum / (data.length / 4)
  } catch {
    return null
  }
}

let lastSample = 0

// Throttled to ~15Hz: the canvas readback is the expensive part and the 500ms colour tween smooths
// between samples, so there's no benefit to probing every frame (and it keeps pan/zoom cheap).
const rectSig = (r: DOMRect) => `${r.left | 0},${r.top | 0},${r.width | 0},${r.height | 0}`

const tick = (now: number) => {
  if (now - lastSample >= 66) {
    lastSample = now
    // Compute the image box once for the whole frame; skip the (expensive) readback for any probe
    // whose image box + element rect are unchanged since its last sample — so a static open image
    // costs only cheap getBoundingClientRect comparisons per frame, no GPU→CPU readbacks.
    const box = focusedImg?.getBoundingClientRect()
    const boxSig = box ? rectSig(box) : ""
    for (const probe of probes) {
      const rect = probe.ref.current?.getBoundingClientRect()
      const sig = rect ? `${boxSig}|${rectSig(rect)}` : ""
      if (sig === probe.lastSig) continue
      probe.lastSig = sig
      const luma = rect && box ? luminanceBehind(rect, box) : null
      let next: boolean | null
      if (luma === null) next = null
      else if (probe.last === true) next = luma >= LIGHT_LOW
      else if (probe.last === false) next = luma > LIGHT_HIGH
      else next = luma > LIGHT_HIGH
      if (next !== probe.last) {
        probe.last = next
        probe.set(next)
      }
    }
  }
  raf = focusedImg ? requestAnimationFrame(tick) : 0
}

/** Set (or clear) the image the floating chrome samples. While set, probes re-evaluate every frame
 *  so the chrome tracks pan/zoom/paging in real time. */
export const setFocusedImage = (img: HTMLImageElement | null) => {
  focusedImg = img
  if (img && !raf) raf = requestAnimationFrame(tick)
  if (!img) {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    for (const probe of probes) {
      probe.lastSig = ""
      if (probe.last !== null) {
        probe.last = null
        probe.set(null)
      }
    }
  }
}

/** Clear the focused image only if it's still the given one (avoids a paging race clearing the new). */
export const clearFocusedImage = (img: HTMLImageElement | null) => {
  if (focusedImg === img) setFocusedImage(null)
}

/** Live luminance of the focused content behind `ref`: `true` = light, `false` = dark, `null` = no
 *  focused image / over the backdrop. Updates every frame while a viewer is open. */
export const useContentLight = (ref: RefObject<HTMLElement | null>): boolean | null => {
  const [light, setLight] = useState<boolean | null>(null)
  useEffect(() => {
    const probe: Probe = { ref, set: setLight, last: null, lastSig: "" }
    probes.add(probe)
    return () => {
      probes.delete(probe)
    }
  }, [ref])
  return light
}

/** Frosted floating-chrome classes contrasting the content behind them: dark chrome over light
 *  content, light chrome over dark content; dark by default when unknown. Colours tween so crossing a
 *  light/dark boundary fades rather than flickers. */
export const adaptiveChrome = (contentLight: boolean | null): string =>
  contentLight === false
    ? "border-black/10 bg-white/70 text-black backdrop-blur-xl transition-colors duration-500 ease-out [&_button]:!text-inherit"
    : "border-white/15 bg-black/45 text-white backdrop-blur-xl transition-colors duration-500 ease-out [&_button]:!text-inherit"
