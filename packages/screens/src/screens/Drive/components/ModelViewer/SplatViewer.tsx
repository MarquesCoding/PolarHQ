/// <reference path="../../../../gaussian-splats-3d.d.ts" />
import { useEffect, useRef, useState } from "react"
import * as GaussianSplats3D from "@mkkellogg/gaussian-splats-3d"
import { ArrowsClockwise } from "@phosphor-icons/react"
import { Icon } from "@workspace/screens/icons"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"
import { adaptiveChrome } from "@components/adaptiveChrome"
import { useTheme } from "@components/theme-provider"

interface SplatViewerProps {
  /** `light` is the source photo's average brightness — the chrome contrasts it (dark pill over a
   *  bright splat, light pill over a dark one), approximating the photo viewer's adaptive chrome. */
  src: { url: string; name: string; light?: boolean }
  onClose: () => void
}

/**
 * Real-time 3D Gaussian Splat viewer (for SHARP `.ply` output). Renders through
 * @mkkellogg/gaussian-splats-3d in its own canvas, opening at the original capture viewpoint — SHARP
 * follows the OpenCV convention (x right, y down, z forward) with the scene centered near (0, 0, +z),
 * so the camera sits at the origin looking down +z with a y-down up-vector, i.e. what the photo saw.
 */
const SplatViewer = ({ src, onClose }: SplatViewerProps) => {
  const { t } = useTranslation("drive")
  const { resolvedTheme } = useTheme()
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [orbit, setOrbit] = useState(false)
  const viewerRef = useRef<GaussianSplats3D.Viewer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let disposed = false

    const viewer = new GaussianSplats3D.Viewer({
      rootElement: container,
      cameraUp: [0, -1, 0],
      initialCameraPosition: [0, 0, -0.05],
      initialCameraLookAt: [0, 0, 1],
      sharedMemoryForWorkers: false,
      dynamicScene: false,
      antialiased: true,
      sphericalHarmonicsDegree: 0,
      useBuiltInControls: true,
    })
    viewerRef.current = viewer

    viewer
      .addSplatScene(src.url, {
        format: GaussianSplats3D.SceneFormat.Ply,
        splatAlphaRemovalThreshold: 5,
        showLoadingUI: false,
        progressiveLoad: false,
      })
      .then(() => {
        if (disposed) return
        setStatus("ready")
        viewer.start()
        window.dispatchEvent(new Event("resize"))
      })
      .catch(() => {
        if (!disposed) setStatus("error")
      })

    return () => {
      disposed = true
      viewerRef.current = null
      try {
        viewer.stop()
      } catch {
        /* not started */
      }
      void viewer.dispose()
    }
  }, [src.url])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    const controls = (
      viewerRef.current as unknown as {
        controls?: { autoRotate: boolean; autoRotateSpeed: number }
      } | null
    )?.controls
    if (!controls) return
    controls.autoRotate = orbit
    controls.autoRotateSpeed = 1.5
  }, [orbit, status])

  useEffect(() => {
    const renderer = (
      viewerRef.current as unknown as {
        renderer?: { setClearColor: (color: number, alpha: number) => void }
      } | null
    )?.renderer
    if (!renderer) return
    renderer.setClearColor(resolvedTheme === "light" ? 0xffffff : 0x000000, 1)
  }, [resolvedTheme, status])

  return (
    <motion.div
      className="bg-background fixed inset-0 z-[80]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
    >
      <div ref={containerRef} className="absolute inset-0" />

      <span
        className={cn(
          "pointer-events-none absolute top-3 left-1/2 z-10 max-w-[40vw] -translate-x-1/2 truncate rounded-full border px-3 py-1 text-xs font-medium shadow-lg",
          adaptiveChrome(src.light ?? null),
        )}
      >
        {src.name}
      </span>

      <div
        className={cn(
          "absolute top-3 right-3 z-10 flex items-center gap-0.5 rounded-full border p-1 shadow-lg",
          adaptiveChrome(src.light ?? null),
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("modelViewer.autoRotate")}
          onClick={() => setOrbit((value) => !value)}
          className={cn("rounded-full", orbit && "bg-muted")}
        >
          <ArrowsClockwise className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("modelViewer.close")}
          onClick={onClose}
          className="rounded-full"
        >
          <Icon name="xmark" className="size-5" />
        </Button>
      </div>

      {status !== "ready" ? (
        <div className="text-muted-foreground pointer-events-none absolute inset-0 flex items-center justify-center text-sm">
          {status === "loading" ? t("modelViewer.loading") : t("modelViewer.openError")}
        </div>
      ) : null}
    </motion.div>
  )
}

export default SplatViewer
