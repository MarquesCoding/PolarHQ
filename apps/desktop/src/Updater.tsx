import { useEffect, useRef, useState } from "react"
import { type UpdateProgress, runUpdater } from "@lib/updater"
import logo from "@components/FlatShell/logo.png"

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
  const done = useRef(false)

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
      className="bg-background flex min-h-svh flex-col items-center justify-center gap-7 select-none"
    >
      <img src={logo} alt="" className="size-20 animate-pulse" draggable={false} />
      <p className="text-muted-foreground text-sm tracking-wide italic">{label}</p>
    </main>
  )
}

export default Updater
