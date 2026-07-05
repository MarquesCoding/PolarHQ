import type { GridAsset } from "@workspace/core/photos"

/** A rectangle in world (layout) space — the shared coordinate system every mode lays entities out in. */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** A floating date label sitting above the first row of a day in grid mode. */
export interface DayMarker {
  key: string
  label: string
  x: number
  y: number
  assetIds: string[]
}

/** The output of a layout engine: where every asset sits, plus any decorations and the world bounds. */
export interface Layout {
  rects: Map<string, Rect>
  markers: DayMarker[]
  width: number
  height: number
}

export type Mode = "grid" | "canvas" | "infinity"

export type SortKey = "date-desc" | "date-asc" | "name-asc" | "name-desc"

/** Maps world space onto the screen: `screen = (world - {x,y}) * zoom`. Grid uses zoom 1 + vertical y. */
export interface Camera {
  x: number
  y: number
  zoom: number
}

export interface GridOptions {
  rowHeight: number
  gap: number
  square: boolean
}

export type { GridAsset }
