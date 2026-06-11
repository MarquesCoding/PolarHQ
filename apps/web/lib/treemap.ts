export interface TreemapRect {
  x: number
  y: number
  w: number
  h: number
}

export interface TreemapTile<T> extends TreemapRect {
  item: T
}

/**
 * Squarified treemap (Bruls/Huizing/van Wijk): lay items out as rectangles whose areas are
 * proportional to their value, preferring near-square tiles. Returns one tile per positive-value
 * item; the tiles exactly partition `rect` with no gaps or overlaps.
 */
export const squarify = <T extends { value: number }>(
  items: T[],
  rect: TreemapRect,
): TreemapTile<T>[] => {
  const positive = items.filter((item) => item.value > 0).sort((a, b) => b.value - a.value)
  const total = positive.reduce((sum, item) => sum + item.value, 0)
  if (total <= 0 || rect.w <= 0 || rect.h <= 0) return []

  const area = rect.w * rect.h
  const scaled = positive.map((item) => ({ item, area: (item.value / total) * area }))

  const tiles: TreemapTile<T>[] = []
  let free: TreemapRect = { ...rect }
  let row: (typeof scaled)[number][] = []

  const worst = (cells: (typeof scaled)[number][], length: number): number => {
    if (cells.length === 0) return Infinity
    const sum = cells.reduce((acc, cell) => acc + cell.area, 0)
    const max = Math.max(...cells.map((cell) => cell.area))
    const min = Math.min(...cells.map((cell) => cell.area))
    return Math.max((length * length * max) / (sum * sum), (sum * sum) / (length * length * min))
  }

  const flushRow = () => {
    const sum = row.reduce((acc, cell) => acc + cell.area, 0)
    if (free.w >= free.h) {
      const w = sum / free.h
      let y = free.y
      for (const cell of row) {
        const h = cell.area / w
        tiles.push({ item: cell.item, x: free.x, y, w, h })
        y += h
      }
      free = { x: free.x + w, y: free.y, w: free.w - w, h: free.h }
    } else {
      const h = sum / free.w
      let x = free.x
      for (const cell of row) {
        const w = cell.area / h
        tiles.push({ item: cell.item, x, y: free.y, w, h })
        x += w
      }
      free = { x: free.x, y: free.y + h, w: free.w, h: free.h - h }
    }
    row = []
  }

  for (const cell of scaled) {
    const length = Math.min(free.w, free.h)
    if (row.length === 0 || worst([...row, cell], length) <= worst(row, length)) {
      row.push(cell)
    } else {
      flushRow()
      row = [cell]
    }
  }
  if (row.length > 0) flushRow()
  return tiles
}
