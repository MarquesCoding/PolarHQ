/* eslint-disable react/no-unknown-property */
import { fetchDecryptedPhotoThumbnail } from "@workspace/core/photosE2e"
import {
  Image,
  MeshTransmissionMaterial,
  Preload,
  Scroll,
  ScrollControls,
  useFBO,
  useGLTF,
  useScroll,
} from "@react-three/drei"
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber"
import { easing } from "maath"
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import * as THREE from "three"
import { thumbnailCache } from "../AssetEntity"
import type { GridAsset } from "../types"

const COLS = 4
const GAP = 0.06
const MAX = 60

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
    const height = Math.max(...colH)
    return { items, height }
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

const Lens = ({ children }: { children: ReactNode }) => {
  const ref = useRef<THREE.Mesh>(null!)
  const { nodes } = useGLTF("/assets/3d/lens.glb") as unknown as { nodes: Record<string, THREE.Mesh> }
  const buffer = useFBO()
  const { viewport: vp } = useThree()
  const [scene] = useState(() => new THREE.Scene())
  const geometry = (nodes.Cylinder as THREE.Mesh)?.geometry

  useFrame((state, delta) => {
    const { gl, viewport, pointer, camera } = state
    const v = viewport.getCurrentViewport(camera, [0, 0, 15])
    const destX = (pointer.x * v.width) / 2
    const destY = (pointer.y * v.height) / 2
    easing.damp3(ref.current.position, [destX, destY, 15], 0.15, delta)

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
      <mesh ref={ref} scale={0.25} rotation-x={Math.PI / 2} geometry={geometry}>
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          ior={1.15}
          thickness={5}
          anisotropy={0.01}
          chromaticAberration={0.1}
        />
      </mesh>
    </>
  )
}

const Scene = ({ assets }: { assets: GridAsset[] }) => {
  const [height, setHeight] = useState(1)
  const vpHeight = useThree((s) => s.viewport.height)
  const pages = Math.max(1, height / vpHeight)
  return (
    <ScrollControls damping={0.2} pages={pages} distance={0.5}>
      <Lens>
        <Scroll>
          <PhotoPlanes assets={assets} onHeight={setHeight} />
        </Scroll>
        <Preload />
      </Lens>
    </ScrollControls>
  )
}

/**
 * The photo grid rendered fully in WebGL — each asset is a textured plane in a three.js scene, so a
 * real glass lens (MeshTransmissionMaterial, ReactBits' fluid-glass approach) genuinely refracts the
 * photos as it tracks the pointer. Decrypted thumbnails feed the textures via the shared cache.
 */
const GlassPhotoGrid = ({ assets }: { assets: GridAsset[] }) => {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas camera={{ position: [0, 0, 20], fov: 15 }} gl={{ alpha: true }} dpr={[1, 2]}>
        <Scene assets={assets} />
      </Canvas>
    </div>
  )
}

useGLTF.preload("/assets/3d/lens.glb")

export default GlassPhotoGrid
