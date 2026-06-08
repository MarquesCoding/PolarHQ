import { API_URL } from "@lib/env"

const PHOTOS = `${API_URL}/api/v1/photos`

export interface DownloadProgress {
  received: number
  total: number
}

const filenameFromHeader = (header: string | null, fallback: string): string => {
  if (!header) return fallback
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (encoded?.[1]) return decodeURIComponent(encoded[1])
  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1] ?? fallback
}

const triggerDownload = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const fetchAndSave = async (
  input: string,
  init: RequestInit,
  fallback: string,
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> => {
  const response = await fetch(input, { credentials: "include", ...init })
  if (!response.ok) throw new Error(`Download failed (${response.status})`)

  let blob: Blob
  if (response.body && onProgress) {
    const total = Number(response.headers.get("Content-Length")) || 0
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      onProgress({ received, total })
    }
    blob = new Blob(chunks as BlobPart[])
  } else {
    blob = await response.blob()
  }

  triggerDownload(blob, filenameFromHeader(response.headers.get("Content-Disposition"), fallback))
}

/** Download a single asset's original file. */
export const downloadAsset = (
  assetId: string,
  fallback = "photo",
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> =>
  fetchAndSave(`${PHOTOS}/assets/${assetId}/download`, { method: "GET" }, fallback, onProgress)

/** Download multiple assets as a single timestamped zip archive. */
export const downloadAssetsZip = (
  assetIds: string[],
  onProgress?: (progress: DownloadProgress) => void,
): Promise<void> =>
  fetchAndSave(
    `${PHOTOS}/assets/actions/download`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetIds }),
    },
    "polarhq-photos.zip",
    onProgress,
  )
