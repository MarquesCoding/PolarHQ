import { type Update, check } from "@tauri-apps/plugin-updater"
import { relaunch } from "@tauri-apps/plugin-process"

const inTauri = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window

export type UpdatePhase =
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "uptodate"
  | "error"

export interface UpdateProgress {
  phase: UpdatePhase
  version?: string
  /** Download fraction 0..1 when the content length is known. */
  fraction?: number
}

/**
 * Check the configured endpoint for a newer signed build and, if found, download + install it,
 * reporting progress as it goes. When an update installs the app **relaunches** (this never resolves).
 *
 * Failure policy: a failed *check* (offline, no release published yet, bad manifest) is non-fatal — we
 * resolve and let the app start, so a missing endpoint never blocks launch. Only a failure *after* an
 * update was found (download/install) throws, so the caller can retry that Discord-style. No-op
 * outside the Tauri runtime (the web shell is served, not updated).
 */
export const runUpdater = async (onProgress: (progress: UpdateProgress) => void): Promise<void> => {
  if (!inTauri()) return

  onProgress({ phase: "checking" })
  let update: Update | null = null
  try {
    update = await check()
  } catch {
    // No reachable manifest / offline → proceed into the app rather than blocking on the splash.
    onProgress({ phase: "uptodate" })
    return
  }

  if (!update) {
    onProgress({ phase: "uptodate" })
    return
  }

  onProgress({ phase: "available", version: update.version })

  let downloaded = 0
  let total = 0
  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = event.data.contentLength ?? 0
      onProgress({ phase: "downloading", version: update.version, fraction: 0 })
    } else if (event.event === "Progress") {
      downloaded += event.data.chunkLength
      onProgress({
        phase: "downloading",
        version: update.version,
        fraction: total > 0 ? downloaded / total : undefined,
      })
    } else if (event.event === "Finished") {
      onProgress({ phase: "installing", version: update.version })
    }
  })

  await relaunch()
}
