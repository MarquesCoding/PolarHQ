import { monthLong, weekdayLong } from "@workspace/i18n/format"
import { t } from "@workspace/i18n/config"
import type { GridAsset, GridOptions, Layout, Rect } from "../types"

const HEADER_HEIGHT = 30
const HEADER_GAP = 6
const INSET = 6

const dateOf = (asset: GridAsset): Date => new Date(asset.takenAt ?? asset.createdAt)
const dayKey = (asset: GridAsset): string => dateOf(asset).toISOString().slice(0, 10)

const aspectOf = (asset: GridAsset): number => {
  const raw = asset.width && asset.height ? asset.width / asset.height : 1
  return Math.min(Math.max(raw, 0.4), 3)
}

const dayLabel = (date: Date): string => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000)
  if (diff <= 0) return t("photos:photoGrid.today")
  if (diff === 1) return t("photos:photoGrid.yesterday")
  if (diff < 7) return weekdayLong(date)
  return `${date.getDate()} ${monthLong(date)} ${date.getFullYear()}`
}

interface Flow {
  asset: GridAsset
  day: string
  dayStart: boolean
  aspect: number
}

/**
 * Continuous justified (or square) flow, days introduced by a floating label above their first row.
 * Emits a flat `Map<id, Rect>` in world space plus the day markers and total bounds — the grid mode's
 * contribution to the shared coordinate system every entity animates within.
 */
export const layoutGrid = (
  assets: GridAsset[],
  width: number,
  options: GridOptions,
  leftInset = 0,
): Layout => {
  const rects = new Map<string, Rect>()
  const markers: Layout["markers"] = []
  if (width <= 0 || assets.length === 0) return { rects, markers, width, height: 0 }

  const { rowHeight, gap, square } = options
  const left = leftInset + INSET
  const inner = Math.max(width - leftInset - INSET * 2, 1)

  const dayIds = new Map<string, string[]>()
  for (const asset of assets) {
    const key = dayKey(asset)
    const list = dayIds.get(key)
    if (list) list.push(asset.id)
    else dayIds.set(key, [asset.id])
  }

  let prevDay: string | null = null
  const items: Flow[] = assets.map((asset) => {
    const day = dayKey(asset)
    const dayStart = day !== prevDay
    prevDay = day
    return { asset, day, dayStart, aspect: aspectOf(asset) }
  })

  const addMarker = (item: Flow, x: number, labelY: number) =>
    markers.push({
      key: `l-${item.day}`,
      label: dayLabel(dateOf(item.asset)),
      x,
      y: labelY + (HEADER_HEIGHT + HEADER_GAP - gap) / 2,
      assetIds: dayIds.get(item.day) ?? [],
    })

  let y = INSET

  if (square) {
    const cols = Math.max(1, Math.round((inner + gap) / (rowHeight + gap)))
    const tile = (inner - (cols - 1) * gap) / cols
    for (let start = 0; start < items.length; start += cols) {
      const slice = items.slice(start, start + cols)
      const labelY = y
      if (slice.some((item) => item.dayStart)) y += HEADER_HEIGHT + HEADER_GAP
      slice.forEach((item, column) => {
        const x = left + column * (tile + gap)
        if (item.dayStart) addMarker(item, x, labelY)
        rects.set(item.asset.id, { x, y, w: tile, h: tile })
      })
      y += tile + gap
    }
  } else {
    let row: Flow[] = []
    let aspectSum = 0
    const flush = (stretch: boolean) => {
      if (row.length === 0) return
      const labelY = y
      if (row.some((item) => item.dayStart)) y += HEADER_HEIGHT + HEADER_GAP
      const rowY = y
      const gaps = (row.length - 1) * gap
      const height = stretch ? (inner - gaps) / aspectSum : rowHeight
      let x = left
      for (const item of row) {
        const cellWidth = height * item.aspect
        if (item.dayStart) addMarker(item, x, labelY)
        rects.set(item.asset.id, { x, y: rowY, w: cellWidth, h: height })
        x += cellWidth + gap
      }
      y = rowY + height + gap
      row = []
      aspectSum = 0
    }
    for (const item of items) {
      row.push(item)
      aspectSum += item.aspect
      if (aspectSum * rowHeight + (row.length - 1) * gap >= inner) flush(true)
    }
    flush(false)
  }

  let bottom = 0
  for (const rect of rects.values()) bottom = Math.max(bottom, rect.y + rect.h)
  return { rects, markers, width, height: bottom + INSET }
}
