import type { GridAsset, Layout, Rect } from "../types"

const INSET = 24
const GAP = 16
const COL_WIDTH = 240

const aspectOf = (asset: GridAsset): number => {
  const raw = asset.width && asset.height ? asset.width / asset.height : 1
  return Math.min(Math.max(raw, 0.5), 2)
}

/**
 * Freeform "canvas" board. Images default to a balanced masonry (shortest-column packing) but any
 * asset with a saved position is placed there verbatim — so the same entities can be dragged around
 * and their arrangement persists, while un-touched ones stay tidy.
 */
export const layoutCanvas = (
  assets: GridAsset[],
  width: number,
  leftInset = 0,
  positions: Map<string, Rect> = new Map(),
): Layout => {
  const rects = new Map<string, Rect>()
  if (width <= 0 || assets.length === 0) return { rects, markers: [], width, height: 0 }

  const usable = width - leftInset - INSET * 2
  const cols = Math.max(2, Math.floor((usable + GAP) / (COL_WIDTH + GAP)))
  const totalW = cols * COL_WIDTH + (cols - 1) * GAP
  const startX = leftInset + INSET + Math.max(0, (usable - totalW) / 2)
  const colHeights = new Array<number>(cols).fill(INSET)
  let bottom = 0

  for (const asset of assets) {
    const saved = positions.get(asset.id)
    if (saved) {
      rects.set(asset.id, saved)
      bottom = Math.max(bottom, saved.y + saved.h)
      continue
    }
    const w = COL_WIDTH
    const h = w / aspectOf(asset)
    let col = 0
    for (let i = 1; i < cols; i += 1) if (colHeights[i]! < colHeights[col]!) col = i
    const x = startX + col * (COL_WIDTH + GAP)
    const y = colHeights[col]!
    rects.set(asset.id, { x, y, w, h })
    colHeights[col] = y + h + GAP
    bottom = Math.max(bottom, y + h + GAP)
  }

  return { rects, markers: [], width, height: bottom + INSET }
}
