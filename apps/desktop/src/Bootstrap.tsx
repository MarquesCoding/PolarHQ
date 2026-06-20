import { Suspense, lazy, useCallback, useEffect, useState } from "react"
import { configureCore } from "@workspace/core/config"
import { APP_BUILD, APP_NAME, APP_VERSION } from "@lib/env"
import { loadServerUrl } from "@lib/server"
import ServerSetup from "./ServerSetup"
import Updater from "./Updater"
import Spinner from "@components/Spinner/Spinner"

const LazyApp = lazy(() => import("./App").then((module) => ({ default: module.App })))

const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window

/** Point the core data layer at the chosen server. Must run before the app's auth/data modules
 *  evaluate, because `authClient` reads `apiUrl` once at import time. */
const connect = (apiUrl: string): void => {
  configureCore({ appName: APP_NAME, apiUrl, appVersion: APP_VERSION, appBuild: APP_BUILD })
}

const Splash = () => (
  <div className="bg-background flex min-h-svh items-center justify-center">
    <Spinner className="size-6" />
  </div>
)

/** Draggable strip behind the overlaid macOS traffic lights, present on every screen (sign-in,
 *  connect, and the app). Zero-height unless the `.tauri` class sets `--titlebar-h`. */
const TitlebarDragRegion = () => (
  <div data-tauri-drag-region className="fixed inset-x-0 top-0 z-[100] h-[var(--titlebar-h,0px)]" />
)

type Phase = "updating" | "loading" | "setup" | "ready"

/**
 * Desktop bootstrap gate. First it runs the launch updater (Discord-style, desktop only) — if a new
 * build installs, the app relaunches here. Then it learns which self-hosted server to talk to: it
 * reads the durable server URL ({@link loadServerUrl}); if present it configures core and lazy-loads
 * the app, otherwise it shows {@link ServerSetup}. The lazy import defers the auth/data graph until
 * after `connect()` runs.
 */
export const Bootstrap = () => {
  const [phase, setPhase] = useState<Phase>(inTauri ? "updating" : "loading")

  const loadServer = useCallback(() => {
    let active = true
    void loadServerUrl().then((url) => {
      if (!active) return
      if (url) {
        connect(url)
        setPhase("ready")
      } else {
        setPhase("setup")
      }
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (phase === "loading") return loadServer()
  }, [phase, loadServer])

  if (phase === "updating") {
    return (
      <>
        <TitlebarDragRegion />
        <Updater onDone={() => setPhase("loading")} />
      </>
    )
  }

  return (
    <>
      <TitlebarDragRegion />
      {phase === "loading" ? (
        <Splash />
      ) : phase === "setup" ? (
        <ServerSetup
          onConnected={(url) => {
            connect(url)
            setPhase("ready")
          }}
        />
      ) : (
        <Suspense fallback={<Splash />}>
          <LazyApp />
        </Suspense>
      )}
    </>
  )
}
