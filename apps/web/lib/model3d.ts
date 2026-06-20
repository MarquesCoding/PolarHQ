import * as THREE from "three"
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"

const extensionOf = (name: string): string => name.split(".").pop()?.toLowerCase() ?? ""

const baseMaterial = (): THREE.MeshStandardMaterial =>
  new THREE.MeshStandardMaterial({
    color: 0xb6bac4,
    metalness: 0.1,
    roughness: 0.6,
    side: THREE.DoubleSide,
    flatShading: false,
  })

const meshFromGeometry = (geometry: THREE.BufferGeometry): THREE.Mesh => {
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, baseMaterial())
}

/** Parse a 3D model's bytes into a Three.js object, picking the loader by file extension. */
export const loadModel = async (name: string, buffer: ArrayBuffer): Promise<THREE.Object3D> => {
  switch (extensionOf(name)) {
    case "stl":
      return meshFromGeometry(new STLLoader().parse(buffer))
    case "ply":
      return meshFromGeometry(new PLYLoader().parse(buffer))
    case "obj":
      return new OBJLoader().parse(new TextDecoder().decode(new Uint8Array(buffer)))
    case "fbx":
      return new FBXLoader().parse(buffer, "")
    case "gltf":
    case "glb":
      return new Promise<THREE.Object3D>((resolve, reject) => {
        new GLTFLoader().parse(buffer, "", (gltf) => resolve(gltf.scene), reject)
      })
    default:
      throw new Error("Unsupported 3D format")
  }
}

export type ShadeMode = "shaded" | "wireframe" | "normals"

const normalMaterial = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide })
const originalMaterials = new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>()
const originalMaps = new WeakMap<THREE.Material, THREE.Texture | null>()

/** Apply the shading mode + texture toggle across every mesh in the object. */
export const applyShadeMode = (
  object: THREE.Object3D,
  mode: ShadeMode,
  showTextures: boolean,
): void => {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    if (!originalMaterials.has(mesh)) originalMaterials.set(mesh, mesh.material)
    const original = originalMaterials.get(mesh)!

    if (mode === "normals") {
      mesh.material = normalMaterial
      return
    }

    mesh.material = original
    const tune = (material: THREE.Material) => {
      const standard = material as THREE.MeshStandardMaterial
      standard.wireframe = mode === "wireframe"
      if ("map" in standard) {
        if (!originalMaps.has(standard)) originalMaps.set(standard, standard.map ?? null)
        standard.map = showTextures ? (originalMaps.get(standard) ?? null) : null
      }
      material.needsUpdate = true
    }
    if (Array.isArray(original)) original.forEach(tune)
    else tune(original)
  })
}

/** Whether any mesh in the object carries a texture map (to show/hide the textures toggle). */
export const hasTextures = (object: THREE.Object3D): boolean => {
  let found = false
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    if (materials.some((m) => (m as THREE.MeshStandardMaterial).map)) found = true
  })
  return found
}

/** Release GPU resources for a loaded model. */
export const disposeModel = (object: THREE.Object3D): void => {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.geometry?.dispose()
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach((m) => m?.dispose())
  })
}
