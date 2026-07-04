/* eslint-disable react/no-unknown-property */
import { fetchDecryptedPhotoThumbnail } from "@workspace/core/photosE2e"
import {
  Image,
  MeshTransmissionMaterial,
  Preload,
  Scroll,
  ScrollControls,
  Text,
  useFBO,
  useGLTF,
} from "@react-three/drei"
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber"
import { easing } from "maath"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { thumbnailCache } from "../AssetEntity"
import type { GridAsset, Mode } from "../types"

const COLS = 4
const GAP = 0.06
const MAX = 60
const NAV: { label: string; mode: Mode }[] = [
  { label: "Grid", mode: "grid" },
  { label: "Canvas", mode: "canvas" },
  { label: "Infinity", mode: "infinity" },
]

const useThumbUrl = (asset: GridAsset): string | null => {
  const [url, setUrl] = useState<string | null>(() =>
    asset.encrypted ? (thumbnailCache.get(asset.id) ?? null) : (asset.thumbnailUrl ?? null),
  )
  useEffect(() => {
    if (!asset.encrypted) {
      setUrl(asset.thumbnailUrl ?? null)
      return
    }
    if (thumbnailCache.has(asset.id)) {
      setUrl(thumbnailCache.get(asset.id) ?? null)
      return
    }
    let active = true
    void fetchDecryptedPhotoThumbnail(asset.id).then((u) => {
      if (!active || !u) return
      thumbnailCache.set(asset.id, u)
      setUrl(u)
    })
    return () => {
      active = false
    }
  }, [asset.id, asset.encrypted, asset.thumbnailUrl])
  return url
}

interface Placed {
  asset: GridAsset
  x: number
  y: number
  w: number
  h: number
}

const PhotoPlane = ({ item }: { item: Placed }) => {
  const url = useThumbUrl(item.asset)
  if (!url) return null
  return <Image url={url} position={[item.x, item.y, 0]} scale={[item.w, item.h]} radius={0.03} />
}

const usePlaced = (assets: GridAsset[], viewWidth: number) => {
  return useMemo(() => {
    const colW = (viewWidth - GAP * (COLS - 1)) / COLS
    const colH = new Array<number>(COLS).fill(0)
    const items: Placed[] = []
    for (const asset of assets.slice(0, MAX)) {
      const aspect = asset.width && asset.height ? asset.width / asset.height : 1
      const h = colW / aspect
      let c = 0
      for (let i = 1; i < COLS; i++) if ((colH[i] ?? 0) < (colH[c] ?? 0)) c = i
      const x = -viewWidth / 2 + colW / 2 + c * (colW + GAP)
      const y = -(colH[c] ?? 0) - h / 2
      colH[c] = (colH[c] ?? 0) + h + GAP
      items.push({ asset, x, y, w: colW, h })
    }
    return { items, height: Math.max(...colH) }
  }, [assets, viewWidth])
}

const PhotoPlanes = ({ assets, onHeight }: { assets: GridAsset[]; onHeight: (h: number) => void }) => {
  const width = useThree((s) => s.viewport.width)
  const { items, height } = usePlaced(assets, width)
  useEffect(() => onHeight(height), [height, onHeight])
  return (
    <group>
      {items.map((item) => (
        <PhotoPlane key={item.asset.id} item={item} />
      ))}
    </group>
  )
}

/** The ReactBits fluid-glass wrapper: portals the scene into an FBO, then a glass mesh refracts it. */
const GlassBar = ({ children }: { children: ReactNode }) => {
  const ref = useRef<THREE.Mesh>(null!)
  const { nodes } = useGLTF("/assets/3d/bar.glb") as unknown as { nodes: Record<string, THREE.Mesh> }
  const buffer = useFBO()
  const { viewport: vp } = useThree()
  const [scene] = useState(() => new THREE.Scene())
  const geometry = (nodes.Cube as THREE.Mesh)?.geometry

  useFrame((state, delta) => {
    const { gl, viewport, camera } = state
    const v = viewport.getCurrentViewport(camera, [0, 0, 15])
    easing.damp3(ref.current.position, [0, -v.height / 2 + 0.2, 15], 0.15, delta)

    gl.setRenderTarget(buffer)
    gl.render(scene, camera)
    gl.setRenderTarget(null)
  })

  return (
    <>
      {createPortal(children, scene)}
      <mesh scale={[vp.width, vp.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent />
      </mesh>
      <mesh ref={ref} scale={0.15} rotation-x={Math.PI / 2} geometry={geometry}>
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          transmission={1}
          roughness={0}
          thickness={10}
          ior={1.15}
          color="#ffffff"
          attenuationColor="#ffffff"
          attenuationDistance={0.25}
          anisotropy={0.01}
          chromaticAberration={0.1}
        />
      </mesh>
    </>
  )
}

const NavItems = ({ mode, onMode }: { mode: Mode; onMode: (m: Mode) => void }) => {
  const group = useRef<THREE.Group>(null!)
  const { viewport, camera } = useThree()
  const spacing = 0.32

  useFrame(() => {
    if (!group.current) return
    const v = viewport.getCurrentViewport(camera, [0, 0, 15])
    group.current.position.set(0, -v.height / 2 + 0.2, 15.1)
    group.current.children.forEach((child, i) => {
      child.position.x = (i - (NAV.length - 1) / 2) * spacing
    })
  })

  return (
    <group ref={group} renderOrder={10}>
      {NAV.map((item) => (
        <Text
          key={item.mode}
          fontSize={0.045}
          color={mode === item.mode ? "#ffffff" : "#c9c9d4"}
          anchorX="center"
          anchorY="middle"
          fillOpacity={mode === item.mode ? 1 : 0.65}
          renderOrder={10}
          onClick={(e) => {
            e.stopPropagation()
            onMode(item.mode)
          }}
          onPointerOver={() => (document.body.style.cursor = "pointer")}
          onPointerOut={() => (document.body.style.cursor = "auto")}
        >
          {item.label}
        </Text>
      ))}
    </group>
  )
}

const Scene = ({ assets, mode, onMode }: { assets: GridAsset[]; mode: Mode; onMode: (m: Mode) => void }) => {
  const [height, setHeight] = useState(1)
  const vpHeight = useThree((s) => s.viewport.height)
  const pages = Math.max(1, height / vpHeight)
  return (
    <ScrollControls damping={0.2} pages={pages} distance={0.5}>
      <NavItems mode={mode} onMode={onMode} />
      <GlassBar>
        <Scroll>
          <PhotoPlanes assets={assets} onHeight={setHeight} />
        </Scroll>
        <Preload />
      </GlassBar>
    </ScrollControls>
  )
}

/**
 * The photo grid rendered in WebGL — each asset is a textured plane in a three.js scene, and a real
 * ReactBits fluid-glass bar (bar.glb + MeshTransmissionMaterial) genuinely refracts the photos behind
 * it, doubling as the mode switcher. Decrypted thumbnails feed the textures via the shared cache.
 */
const GlassPhotoGrid = ({
  assets,
  mode,
  onMode,
}: {
  assets: GridAsset[]
  mode: Mode
  onMode: (m: Mode) => void
}) => {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 20], fov: 15 }} gl={{ alpha: true }} dpr={[1, 2]}>
        <Scene assets={assets} mode={mode} onMode={onMode} />
      </Canvas>
    </div>
  )
}

useGLTF.preload("/assets/3d/bar.glb")

export default GlassPhotoGrid
