import { Suspense, lazy, useEffect, useState } from "react"
import { openUrl } from "@tauri-apps/plugin-opener"
import { configureCore } from "@workspace/core/config"
import { configureHost } from "@workspace/core/host"
import { configureSecureStore } from "@workspace/core/secureStore"
import { configureAuthTokenStore } from "@workspace/core/authToken"
import { tauriSecureStoreBackend } from "@lib/secureStore"
import { loadAuthToken, saveAuthToken } from "@lib/authToken"
import { APP_BUILD, APP_NAME, APP_VERSION } from "@lib/env"
import { loadLastServerUrl, loadServerUrl, saveServerUrl } from "@lib/server"
import { generateSplat, nativeMediaUrl } from "@lib/native"
import Updater from "./Updater"
import Spinner from "@components/Spinner/Spinner"

const LazyApp = lazy(() => import("./App").then((module) => ({ default: module.App })))

const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window

/** Point the core data layer at a server. The auth client reads the configured URL per request, so
 *  this can change at runtime (the sign-in screen lets the user pick their server) without a reload. */
const connect = (apiUrl: string): void => {
  configureCore({ appName: APP_NAME, apiUrl, appVersion: APP_VERSION, appBuild: APP_BUILD })
}

const Splash = () => (
  <div className="bg-background flex min-h-svh items-center justify-center">
    <Spinner className="size-6" />
  </div>
)

/** Draggable strip behind the overlaid macOS traffic lights, present on every screen. Zero-height
 *  unless the `.tauri` class sets `--titlebar-h`. */
const TitlebarDragRegion = () => (
  <div data-tauri-drag-region className="fixed inset-x-0 top-0 z-[100] h-[var(--titlebar-h,0px)]" />
)

interface ServerBridge {
  last: string | null
  save: (url: string) => void
}

type Phase = "updating" | "configuring" | "ready"

/**
 * Desktop bootstrap gate. Runs the launch updater (Discord-style, desktop only), then configures the
 * core data layer with the stored server and installs `window.__polarServer` — the bridge the shared
 * sign-in screen uses to pre-fill the last server and persist the chosen one. The server is picked
 * right on the sign-in page (no separate connect screen); a returning user with a stored server skips
 * straight to the app.
 */
export const Bootstrap = () => {
  const [phase, setPhase] = useState<Phase>(inTauri ? "updating" : "configuring")

  useEffect(() => {
    if (phase !== "configuring") return
    let active = true
    void (async () => {
      const [stored, last] = await Promise.all([loadServerUrl(), loadLastServerUrl()])
      connect(stored ?? last ?? "http://localhost:3001")
      if (inTauri) {
        const savedToken = await loadAuthToken()
        configureAuthTokenStore({ load: () => savedToken, save: (token) => void saveAuthToken(token) })
        configureSecureStore(tauriSecureStoreBackend)
        configureHost({
          isDesktop: true,
          openExternal: (url) => void openUrl(url),
          nativeMediaUrl,
          generateSplat,
        })
      }
      const win = window as Window & { __polarServer?: ServerBridge }
      win.__polarServer = {
        last: last ?? stored ?? null,
        save: (url) => {
          connect(url)
          void saveServerUrl(url)
        },
      }
      if (inTauri) {
        void import("@lib/sync").then((mod) => mod.registerSyncBridge()).catch(() => undefined)
      }
      if (active) setPhase("ready")
    })()
    return () => {
      active = false
    }
  }, [phase])

  if (phase === "updating") {
    return (
      <>
        <TitlebarDragRegion />
        <Updater onDone={() => setPhase("configuring")} />
      </>
    )
  }

  return (
    <>
      <TitlebarDragRegion />
      {phase === "configuring" ? (
        <Splash />
      ) : (
        <Suspense fallback={<Splash />}>
          <LazyApp />
        </Suspense>
      )}
    </>
  )
}
