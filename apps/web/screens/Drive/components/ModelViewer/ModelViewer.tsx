"use client"
/* eslint-disable react/no-unknown-property */

import { Suspense, useEffect, useMemo, useState } from "react"
import type { DriveNode } from "@lib/drive"
import { fetchDecryptedFile } from "@lib/driveE2e"
import { API_URL } from "@lib/env"
import { Icon } from "@lib/icons"
import {
  type ShadeMode,
  applyShadeMode,
  disposeModel,
  hasTextures,
  loadModel,
} from "@lib/model3d"
import {
  IconBox,
  IconGridDots,
  IconRotate360,
  IconTexture,
  IconVectorTriangle,
} from "@tabler/icons-react"
import { Bounds, Grid, OrbitControls } from "@react-three/drei"
import { Canvas } from "@react-three/fiber"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"
import type * as THREE from "three"

interface ModelViewerProps {
  node: DriveNode
  onClose: () => void
}

const fetchModelBuffer = async (node: DriveNode): Promise<ArrayBuffer> => {
  if (node.encrypted && node.downloadUrl) {
    const url = await fetchDecryptedFile(node.id, node.downloadUrl, node.mimeType)
    if (!url) throw new Error("Could not decrypt model")
    try {
      return await fetch(url).then((r) => r.arrayBuffer())
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  const href = node.downloadUrl ?? `${API_URL}/api/v1/drive/nodes/${node.id}/download`
  return fetch(href, { credentials: "include" }).then((r) => r.arrayBuffer())
}

const Scene = ({
  object,
  mode,
  showTextures,
  autoRotate,
}: {
  object: THREE.Object3D
  mode: ShadeMode
  showTextures: boolean
  autoRotate: boolean
}) => {
  useMemo(() => applyShadeMode(object, mode, showTextures), [object, mode, showTextures])
  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight intensity={0.5} />
      <directionalLight position={[4, 8, 6]} intensity={1.1} />
      <directionalLight position={[-6, -3, -4]} intensity={0.3} />
      <Bounds fit clip observe margin={1.2}>
        <primitive object={object} />
      </Bounds>
      <OrbitControls makeDefault autoRotate={autoRotate} autoRotateSpeed={1.4} enableDamping />
    </>
  )
}

/** Full-screen 3D viewer for Drive models (STL/OBJ/FBX/PLY/glTF), with shading + texture toggles. */
const ModelViewer = ({ node, onClose }: ModelViewerProps) => {
  const [object, setObject] = useState<THREE.Object3D | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<ShadeMode>("shaded")
  const [showGrid, setShowGrid] = useState(true)
  const [autoRotate, setAutoRotate] = useState(false)
  const [showTextures, setShowTextures] = useState(true)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    let loaded: THREE.Object3D | null = null
    setObject(null)
    setError(null)
    void (async () => {
      try {
        const buffer = await fetchModelBuffer(node)
        const result = await loadModel(node.name, buffer)
        if (cancelled) {
          disposeModel(result)
          return
        }
        loaded = result
        setObject(result)
      } catch {
        if (!cancelled) setError("Could not open this 3D file.")
      }
    })()
    return () => {
      cancelled = true
      if (loaded) disposeModel(loaded)
    }
  }, [node])

  const textured = object ? hasTextures(object) : false

  const modes: { key: ShadeMode; label: string; icon: typeof IconBox }[] = [
    { key: "shaded", label: "Shaded", icon: IconBox },
    { key: "wireframe", label: "Wireframe", icon: IconVectorTriangle },
    { key: "normals", label: "Normals", icon: IconTexture },
  ]

  return (
    <motion.div
      className="bg-background/90 fixed inset-0 z-50 flex flex-col backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="panel flex min-w-0 items-center gap-1.5 rounded-full p-1 pr-3 shadow-lg">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full"
          >
            <Icon name="xmark" className="size-5" />
          </Button>
          <span className="truncate text-xs font-medium">{node.name}</span>
        </div>

        <div className="panel flex items-center gap-0.5 rounded-full p-1 shadow-lg">
          {modes.map((item) => (
            <Button
              key={item.key}
              variant="ghost"
              size="sm"
              onClick={() => setMode(item.key)}
              className={cn("rounded-full", mode === item.key && "bg-muted")}
            >
              <item.icon className="size-4" />
              {item.label}
            </Button>
          ))}
          <span className="bg-border mx-0.5 h-5 w-px" />
          {textured ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Toggle textures"
              onClick={() => setShowTextures((value) => !value)}
              className={cn("rounded-full", showTextures && "bg-muted")}
            >
              <IconTexture className="size-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Toggle grid"
            onClick={() => setShowGrid((value) => !value)}
            className={cn("rounded-full", showGrid && "bg-muted")}
          >
            <IconGridDots className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Auto-rotate"
            onClick={() => setAutoRotate((value) => !value)}
            className={cn("rounded-full", autoRotate && "bg-muted")}
          >
            <IconRotate360 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {error ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {error}
          </div>
        ) : (
          <Canvas camera={{ position: [3, 2.5, 3], fov: 50 }} dpr={[1, 2]}>
            <color attach="background" args={["#0b0b0d"]} />
            <Suspense fallback={null}>{object ? (
              <Scene
                object={object}
                mode={mode}
                showTextures={showTextures}
                autoRotate={autoRotate}
              />
            ) : null}</Suspense>
            {showGrid ? (
              <Grid
                infiniteGrid
                cellSize={0.5}
                sectionSize={2.5}
                fadeDistance={28}
                sectionColor="#3a3a42"
                cellColor="#26262c"
              />
            ) : null}
          </Canvas>
        )}
        {!object && !error ? (
          <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
            Loading model…
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}

export default ModelViewer
