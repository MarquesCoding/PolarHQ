/** Drag payload + helpers for opening a second app beside the current one (split view). */

export const SPLIT_APP_MIME = "application/orbit-app"

export interface SplitApp {
  id: string
  name: string
  route: string
  icon: string
}

/** Read a dragged app payload from a drag event's data transfer, if present. */
export const readSplitApp = (data: DataTransfer | null): SplitApp | null => {
  const raw = data?.getData(SPLIT_APP_MIME)
  if (!raw) return null
  try {
    return JSON.parse(raw) as SplitApp
  } catch {
    return null
  }
}
