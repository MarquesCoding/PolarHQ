import { useEffect, useRef, useState } from "react"
import { type UpdateProgress, runUpdater } from "@lib/updater"
import { updaterWindowMode } from "@lib/native"
import { APP_VERSION } from "@lib/env"
import logo from "@components/FlatShell/logo.png"

/** Rotating "Did you know?" tips shown on the launch splash — quick ways to get around PolarHQ. */
const TIPS = [
  "Press ⌘K anywhere to open the command palette.",
  "Jump around fast — press G then D for Drive, or G then P for Photos.",
  "Back up a folder automatically from Account → Synced folders.",
  "Everything you store is end-to-end encrypted — only you hold the keys.",
  "Right-click a photo in the viewer for quick actions.",
  "Bring your Google Photos & Drive over from Account → Import from Google.",
  "Drive and Photos share the same encrypted files — no duplicates.",
]

interface UpdaterProps {
  /** Called once the app is up to date (or after a non-fatal skip). When an update installs, the app
   *  relaunches instead and this never fires. */
  onDone: () => void
}

const RETRY_MS = 10_000

/**
 * Discord-style launch updater: a titleless splash that checks for an update on start and, if one
 * exists, downloads + installs it (then the app relaunches). On failure it counts down and retries,
 * matching the "update failed — retrying in 10 sec" behaviour. Shown only in the desktop shell.
 */
const Updater = ({ onDone }: UpdaterProps) => {
  const [progress, setProgress] = useState<UpdateProgress>({ phase: "checking" })
  const [retryIn, setRetryIn] = useState<number | null>(null)
  const [tip, setTip] = useState(0)
  const done = useRef(false)

  // Discord-style: shrink to a small, traffic-light-free window while updating; restore on hand-off.
  useEffect(() => {
    void updaterWindowMode(true).catch(() => undefined)
    return () => {
      void updaterWindowMode(false).catch(() => undefined)
    }
  }, [])

  // Rotate the "Did you know?" tips.
  useEffect(() => {
    const id = setInterval(() => setTip((current) => (current + 1) % TIPS.length), 6000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let countdown: ReturnType<typeof setInterval> | undefined

    const finish = () => {
      if (done.current) return
      done.current = true
      onDone()
    }

    const attempt = async () => {
      try {
        await runUpdater((next) => {
          if (!cancelled) setProgress(next)
        })
        finish()
      } catch {
        if (cancelled) return
        setProgress({ phase: "error" })
        let remaining = RETRY_MS / 1000
        setRetryIn(remaining)
        countdown = setInterval(() => {
          remaining -= 1
          setRetryIn(remaining > 0 ? remaining : 0)
        }, 1000)
        retryTimer = setTimeout(() => {
          clearInterval(countdown)
          setRetryIn(null)
          void attempt()
        }, RETRY_MS)
      }
    }

    void attempt()
    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      clearInterval(countdown)
    }
  }, [onDone])

  const label = (() => {
    if (retryIn !== null) return `Update failed — retrying in ${retryIn} sec`
    switch (progress.phase) {
      case "available":
        return "Update found…"
      case "downloading":
        return progress.fraction !== undefined
          ? `Downloading update… ${Math.round(progress.fraction * 100)}%`
          : "Downloading update…"
      case "installing":
        return "Installing update…"
      default:
        return "Checking for updates…"
    }
  })()

  return (
    <main
      data-tauri-drag-region
      className="bg-background relative flex min-h-svh flex-col items-center justify-center gap-7 select-none"
    >
      <img src={logo} alt="" className="size-20" draggable={false} />
      <div className="flex flex-col items-center gap-4">
        <p className="text-foreground text-sm font-semibold tracking-wide">{label}</p>
        <div className="relative h-1.5 w-52 overflow-hidden rounded-full bg-muted">
          <div className="updater-progress-fill" />
        </div>
      </div>
      <div className="flex max-w-[17rem] flex-col items-center gap-1.5 px-6 text-center">
        <p className="text-primary text-[0.7rem] font-bold tracking-widest uppercase">
          Did you know?
        </p>
        <p
          key={tip}
          className="text-muted-foreground animate-in fade-in text-xs leading-relaxed duration-700"
        >
          {TIPS[tip]}
        </p>
      </div>
      <p className="text-muted-foreground absolute bottom-5 text-xs tracking-wide tabular-nums">
        v{APP_VERSION}
      </p>
    </main>
  )
}

export default Updater
