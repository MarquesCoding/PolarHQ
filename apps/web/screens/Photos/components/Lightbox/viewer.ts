import type { ReactNode } from "react"
import type { ShareLink, ShareOptions } from "@lib/drive"

/**
 * A single viewable media item, normalised so the Lightbox is agnostic to its source (a Photos
 * `GridAsset` or a Drive `DriveNode`). Encrypted items resolve their display URLs lazily via the
 * controller; non-encrypted items expose plain URLs directly.
 */
export interface ViewerItem {
  id: string
  kind: "image" | "video" | "audio"
  name: string
  mimeType: string
  sizeBytes: number
  encrypted: boolean
  /** Best non-encrypted image to show in the stage (preview/original). */
  previewUrl?: string | null
  /** Non-encrypted full original — used for audio playback, copy-to-clipboard and the editor. */
  originalUrl?: string | null
  /** Non-encrypted thumbnail for the filmstrip + ambient backdrop. */
  thumbnailUrl?: string | null
  /** Non-encrypted video source. */
  videoUrl?: string | null
  /** Whether the item carries a paired motion video (Live Photo). */
  motion?: boolean
  isFavorite?: boolean
}

export interface ShareConfig {
  createLink: (options: ShareOptions) => Promise<ShareLink>
  encryptKeyId?: string
}

/** Persists an in-editor result as a new derivative of `item`. */
export interface ViewerEditing {
  save: (item: ViewerItem, file: File) => Promise<void>
}

/**
 * The data layer the Lightbox renders against. `items` is the carousel; the fetchers resolve
 * encrypted sources to object URLs (the Lightbox revokes them). Every action is optional — when
 * omitted, the Lightbox hides the corresponding control. Photos and Drive each provide one.
 */
export interface ViewerController {
  items: ViewerItem[]
  /** Resolve a display/original object URL for an encrypted item (revoked by the Lightbox). */
  fetchOriginal: (item: ViewerItem) => Promise<string | null>
  /** Resolve a thumbnail object URL for an encrypted item (used by the filmstrip). */
  fetchThumbnail: (item: ViewerItem) => Promise<string | null>
  /** Resolve the paired motion video for an encrypted item. */
  fetchMotion?: (item: ViewerItem) => Promise<string | null>
  toggleFavorite?: (item: ViewerItem) => Promise<void>
  trash?: (item: ViewerItem) => Promise<void>
  download?: (item: ViewerItem) => void
  share?: (item: ViewerItem) => ShareConfig
  /** Right-side details panel content (Photos EXIF panel / Drive file details). The Lightbox passes
   *  its favourite/share handlers so the panel's buttons drive the same actions + share dialog. */
  renderInfo?: (
    item: ViewerItem,
    helpers: { onFavorite?: () => void; onShare?: () => void },
  ) => ReactNode
  /** In-place editing support (Photos only); absent ⇒ the edit control is hidden. */
  editing?: ViewerEditing
}
