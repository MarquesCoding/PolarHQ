"use client"

import exifr from "exifr"

/** A run of at least this many rapid frames from one camera is treated as a burst. */
const BURST_MIN = 3
/** Max gap between consecutive frames within a single burst. */
const GAP_MS = 700

const isImage = (file: File): boolean =>
  file.type.startsWith("image/") || /\.(jpe?g|png|heic|heif|webp|tiff?|dng)$/i.test(file.name)

interface Shot {
  file: File
  model: string
  instant: number
}

/** Apple/most cameras write the fractional second as a string of digits ("372" => .372s). */
const subSecMs = (value: unknown): number => {
  if (typeof value !== "string") return 0
  const digits = value.trim().slice(0, 3).padEnd(3, "0")
  const parsed = Number(digits)
  return Number.isFinite(parsed) ? parsed : 0
}

const readShot = async (file: File): Promise<Shot | null> => {
  try {
    const data = await exifr.parse(file, {
      pick: ["DateTimeOriginal", "SubSecTimeOriginal", "Model"],
    })
    const taken = data?.DateTimeOriginal
    if (!(taken instanceof Date) || Number.isNaN(taken.getTime())) return null
    return {
      file,
      model: typeof data?.Model === "string" ? data.Model : "",
      instant: taken.getTime() + subSecMs(data?.SubSecTimeOriginal),
    }
  } catch {
    return null
  }
}

/**
 * Detect burst groups among a set of upload files entirely client-side (the server only ever
 * sees ciphertext, so it cannot do this). A burst = a run of >= BURST_MIN images from the same
 * camera whose consecutive capture instants are within GAP_MS of each other. Each returned group
 * is ordered by capture time, so its first frame is the natural cover. Files that aren't part of
 * a burst aren't returned.
 */
export const detectBurstGroups = async (files: File[]): Promise<File[][]> => {
  const candidates = files.filter(isImage)
  if (candidates.length < BURST_MIN) return []

  const shots = (await Promise.all(candidates.map(readShot))).filter(
    (shot): shot is Shot => shot !== null,
  )
  if (shots.length < BURST_MIN) return []

  const byModel = new Map<string, Shot[]>()
  for (const shot of shots) {
    const list = byModel.get(shot.model)
    if (list) list.push(shot)
    else byModel.set(shot.model, [shot])
  }

  const groups: File[][] = []
  for (const list of byModel.values()) {
    list.sort((a, b) => a.instant - b.instant)
    let run: Shot[] = []
    const flush = () => {
      if (run.length >= BURST_MIN) groups.push(run.map((shot) => shot.file))
      run = []
    }
    for (const shot of list) {
      const prev = run[run.length - 1]
      if (prev && shot.instant - prev.instant > GAP_MS) flush()
      run.push(shot)
    }
    flush()
  }
  return groups
}
