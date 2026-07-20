import { Suspense, lazy, useEffect, useState } from "react"

const SplatViewer = lazy(() => import("./SplatViewer"))
const ModelViewer = lazy(() => import("./ModelViewer"))

interface SplatResultProps {
  splat: { url: string; name: string }
  onClose: () => void
}

/** 3DGS PLYs carry per-splat rotation/scale/SH color; a plain point cloud doesn't. */
const looksLikeGaussianSplat = (header: string): boolean =>
  /property float (rot_0|scale_0|f_dc_0)/.test(header)

/**
 * Routes a generated `.ply` to the matching viewer: SHARP output (a real 3D Gaussian Splat) renders
 * in {@link SplatViewer}; the offline heuristic's plain colored point cloud renders in the mesh/point
 * {@link ModelViewer}. The choice is made by sniffing the PLY header (a small range read).
 */
const SplatResult = ({ splat, onClose }: SplatResultProps) => {
  const [kind, setKind] = useState<"splat" | "cloud" | null>(null)

  useEffect(() => {
    let active = true
    setKind(null)
    void fetch(splat.url, { headers: { Range: "bytes=0-4095" } })
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        if (!active) return
        const header = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buffer))
        setKind(looksLikeGaussianSplat(header) ? "splat" : "cloud")
      })
      .catch(() => active && setKind("cloud"))
    return () => {
      active = false
    }
  }, [splat.url])

  if (kind === null) return null
  return (
    <Suspense fallback={null}>
      {kind === "splat" ? (
        <SplatViewer src={splat} onClose={onClose} />
      ) : (
        <ModelViewer src={splat} onClose={onClose} />
      )}
    </Suspense>
  )
}

export default SplatResult
