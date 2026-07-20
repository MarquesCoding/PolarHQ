declare module "@mkkellogg/gaussian-splats-3d" {
  export const SceneFormat: {
    readonly Splat: number
    readonly KSplat: number
    readonly Ply: number
    readonly Spz: number
  }

  export class Viewer {
    constructor(options?: Record<string, unknown>)
    addSplatScene(
      path: string,
      options?: Record<string, unknown>,
    ): Promise<void> & { abort?: () => void }
    start(): void
    stop(): void
    dispose(): Promise<void>
  }
}
