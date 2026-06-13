"use client"

import { apiFetch } from "@polarhq/sdk/apiClient"
import { decryptWithMetaKey, encryptWithMetaKey, isUnlocked } from "./e2e"
import { encryptedGpsFor, fetchDecryptedPhotoOriginal } from "./photosE2e"

const decoder = new TextDecoder()
const encoder = new TextEncoder()

export interface PhotoPoint {
  assetId: string
  lat: number
  lng: number
  takenAt: string | null
}

interface LocationRow {
  assetId: string
  encryptedLocation: string
  takenAt: string | null
}

/** Fetch + decrypt every photo's stored location into map points (skipping the no-GPS marker). */
export const fetchPhotoPoints = async (): Promise<PhotoPoint[]> => {
  const { locations } = await apiFetch<{ locations: LocationRow[] }>("/api/v1/photos/locations")
  const points: PhotoPoint[] = []
  for (const row of locations) {
    const bytes = decryptWithMetaKey(row.encryptedLocation)
    if (!bytes) continue
    try {
      const value = JSON.parse(decoder.decode(bytes)) as { lat?: number; lng?: number }
      if (typeof value.lat === "number" && typeof value.lng === "number") {
        points.push({ assetId: row.assetId, lat: value.lat, lng: value.lng, takenAt: row.takenAt })
      }
    } catch {
      /* skip undecodable */
    }
  }
  return points
}

const NO_LOCATION = (): string | null => encryptWithMetaKey(encoder.encode("{}"))

let backfilling = false
/**
 * Backfill locations for existing encrypted photos: decrypt each original, read its EXIF GPS,
 * and store the encrypted coordinates (or a no-location marker so it isn't re-checked).
 */
export const runLocationBackfill = async (): Promise<void> => {
  if (backfilling || !isUnlocked()) return
  backfilling = true
  try {
    const { assetIds } = await apiFetch<{ assetIds: string[] }>("/api/v1/photos/locations/missing")
    for (const id of assetIds) {
      const url = await fetchDecryptedPhotoOriginal(id, "image/jpeg")
      if (!url) continue
      try {
        const blob = await fetch(url).then((r) => r.blob())
        const file = new File([blob], "photo.jpg", { type: blob.type || "image/jpeg" })
        const encrypted = (await encryptedGpsFor(file)) ?? NO_LOCATION()
        if (encrypted)
          await apiFetch(`/api/v1/photos/assets/${id}/location`, {
            method: "PUT",
            body: JSON.stringify({ encryptedLocation: encrypted }),
          })
      } catch {
        /* skip a photo that fails */
      } finally {
        URL.revokeObjectURL(url)
      }
    }
  } finally {
    backfilling = false
  }
}
