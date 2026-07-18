const MAX_DIMENSION = 400
const QUALITY = 0.8

export interface ImageAnalysis {
  /** Downscaled JPEG thumbnail bytes. */
  thumbnail: Uint8Array
  /** The image's natural dimensions (needed for the justified grid layout). */
  width: number
  height: number
}

/**
 * Decode an image once to produce a downscaled JPEG thumbnail and read its natural
 * dimensions — both in the browser, so an E2E server never sees the pixels.
 */
export const analyzeImage = (file: File, maxDimension = MAX_DIMENSION): Promise<ImageAnalysis> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not load image"))
    }
    image.onload = () => {
      const width = image.width
      const height = image.height
      const scale = Math.min(1, maxDimension / Math.max(width, height))
      const canvas = document.createElement("canvas")
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      const ctx = canvas.getContext("2d")
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error("No canvas context"))
        return
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          if (!blob) {
            reject(new Error("Could not encode thumbnail"))
            return
          }
          blob
            .arrayBuffer()
            .then((buffer) => resolve({ thumbnail: new Uint8Array(buffer), width, height }))
        },
        "image/jpeg",
        QUALITY,
      )
    }
    image.src = url
  })

/** Generate a downscaled JPEG thumbnail for an image file, in the browser. */
export const generateImageThumbnail = (file: File): Promise<Uint8Array> =>
  analyzeImage(file).then((r) => r.thumbnail)

export interface VideoAnalysis {
  /** A downscaled JPEG poster frame (null if the browser couldn't decode the video). */
  poster: Uint8Array | null
  width: number
  height: number
  durationMs: number
}

/**
 * Decode a video in the browser to grab a poster frame + its dimensions/duration, so an
 * E2E server (which can't process the ciphertext) still gets a thumbnail + grid metadata.
 */
export const analyzeVideo = (file: File, maxDimension = MAX_DIMENSION): Promise<VideoAnalysis> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.muted = true
    let meta = { width: 0, height: 0, durationMs: 0 }
    let settled = false
    const finish = (result: VideoAnalysis) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(result)
    }
    const fail = () => finish({ poster: null, ...meta })
    const timer = setTimeout(fail, 8000)
    video.onerror = fail
    video.onloadedmetadata = () => {
      meta = {
        width: video.videoWidth,
        height: video.videoHeight,
        durationMs: Math.round((video.duration || 0) * 1000),
      }
      video.currentTime = Math.min(1, (video.duration || 2) / 2)
    }
    video.onseeked = () => {
      try {
        const scale = Math.min(1, maxDimension / Math.max(meta.width || 1, meta.height || 1))
        const canvas = document.createElement("canvas")
        canvas.width = Math.max(1, Math.round((meta.width || 1) * scale))
        canvas.height = Math.max(1, Math.round((meta.height || 1) * scale))
        const ctx = canvas.getContext("2d")
        if (!ctx) return fail()
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => {
            if (!blob) return finish({ poster: null, ...meta })
            blob.arrayBuffer().then((buf) => finish({ poster: new Uint8Array(buf), ...meta }))
          },
          "image/jpeg",
          QUALITY,
        )
      } catch {
        fail()
      }
    }
    video.src = url
  })

/** Read an audio file's duration (ms) in the browser. */
export const analyzeAudio = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const audio = document.createElement("audio")
    audio.preload = "metadata"
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Math.round((audio.duration || 0) * 1000))
    }
    audio.src = url
  })
