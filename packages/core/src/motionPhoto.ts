"use client"

const VIDEO_EXTENSION = /\.(mov|mp4|m4v)$/i

const basename = (name: string): string => name.replace(/\.[^./\\]+$/, "").toLowerCase()

const indexOfSequence = (haystack: Uint8Array, needle: number[], from: number): number => {
  outer: for (let i = from; i <= haystack.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) {
      if (haystack[i + j] !== needle[j]) continue outer
    }
    return i
  }
  return -1
}

const FTYP = [0x66, 0x74, 0x79, 0x70]

/**
 * Extract the embedded motion clip from a Google/Samsung Motion Photo — a single JPEG with an
 * MP4 appended after the still. We scan for the MP4's `ftyp` box whose 4-byte big-endian size
 * prefix is plausible, and slice from there to EOF. Returns null for plain images (Apple Live
 * Photos ship the clip as a separate file and are paired by name instead).
 */
export const extractMotionVideo = async (file: File): Promise<Uint8Array | null> => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length < 8 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let search = 2
  while (search < bytes.length) {
    const ftyp = indexOfSequence(bytes, FTYP, search)
    if (ftyp < 6) return null
    const start = ftyp - 4
    const boxSize = (bytes[start]! << 24) | (bytes[start + 1]! << 16) | (bytes[start + 2]! << 8) | bytes[start + 3]!
    if (boxSize >= 8 && boxSize <= 0x10000 && bytes.length - start > 8192) {
      return bytes.slice(start)
    }
    search = ftyp + 4
  }
  return null
}

export interface MotionPairing {
  /** Files to upload, each optionally carrying its paired motion clip. */
  uploads: { file: File; motion?: File }[]
}

/**
 * Pair Apple Live Photos: an image and a video sharing the same basename (IMG_1234.HEIC +
 * IMG_1234.MOV) become one motion photo, with the video consumed rather than uploaded on its
 * own. Unpaired videos stay standalone uploads.
 */
export const pairLivePhotos = (files: File[]): MotionPairing => {
  const videosByBase = new Map<string, File>()
  for (const file of files) {
    if (file.type.startsWith("video/") || VIDEO_EXTENSION.test(file.name)) {
      videosByBase.set(basename(file.name), file)
    }
  }
  const paired = new Set<File>()
  const uploads: { file: File; motion?: File }[] = []
  for (const file of files) {
    const isVideo = file.type.startsWith("video/") || VIDEO_EXTENSION.test(file.name)
    if (isVideo) continue
    const isImage = file.type.startsWith("image/")
    const motion = isImage ? videosByBase.get(basename(file.name)) : undefined
    if (motion) paired.add(motion)
    uploads.push({ file, motion })
  }
  for (const file of files) {
    const isVideo = file.type.startsWith("video/") || VIDEO_EXTENSION.test(file.name)
    if (isVideo && !paired.has(file)) uploads.push({ file })
  }
  return { uploads }
}
