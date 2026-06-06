export const MODEL_EXTENSIONS = ["stl", "obj", "fbx", "ply", "gltf", "glb"] as const

const extensionOf = (name: string): string => name.split(".").pop()?.toLowerCase() ?? ""

export const is3DModelName = (name: string): boolean =>
  (MODEL_EXTENSIONS as readonly string[]).includes(extensionOf(name))
