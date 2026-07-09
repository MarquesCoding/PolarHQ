import { memo, useEffect, useRef, useState } from "react"
import { fetchDecryptedPhotoThumbnail } from "@workspace/core/photosE2e"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"
import { thumbnailCache } from "./AssetEntity"
import type { GridAsset } from "./types"

const StripThumb = ({
  asset,
  active,
  onClick,
}: {
  asset: GridAsset
  active: boolean
  onClick: () => void
}) => {
  const [src, setSrc] = useState<string | null>(() =>
    asset.encrypted ? (thumbnailCache.get(asset.id) ?? null) : asset.thumbnailUrl,
  )
  useEffect(() => {
    if (!asset.encrypted || thumbnailCache.has(asset.id) || !asset.thumbnailUrl) return
    let live = true
    void fetchDecryptedPhotoThumbnail(asset.id).then((url) => {
      if (!url) return
      thumbnailCache.set(asset.id, url)
      if (live) setSrc(url)
    })
    return () => {
      live = false
    }
  }, [asset.id, asset.encrypted, asset.thumbnailUrl])
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active}
      className={cn(
        "relative h-12 shrink-0 overflow-hidden rounded-md bg-white/10 transition-all duration-200",
        active ? "w-12 ring-2 ring-white" : "w-9 opacity-45 hover:opacity-90",
      )}
    >
      {src ? (
        <img src={src} alt="" draggable={false} className="h-full w-full object-cover" />
      ) : null}
    </button>
  )
}

interface FilmstripProps {
  assets: GridAsset[]
  currentId: string
  onJump: (id: string) => void
}

// Only mount a window around the current asset so opening the strip on a huge library doesn't kick
// off thousands of thumbnail decrypts; navigating re-centres the window.
const RADIUS = 30

const Filmstrip = ({ assets, currentId, onJump }: FilmstripProps) => {
  const activeRef = useRef<HTMLDivElement>(null)
  const index = assets.findIndex((asset) => asset.id === currentId)
  const start = Math.max(0, index - RADIUS)
  const windowed = assets.slice(start, index + RADIUS + 1)
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" })
  }, [currentId])
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 14 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      onPointerDown={(event) => event.stopPropagation()}
      className="bg-background/60 pointer-events-auto fixed bottom-20 left-1/2 z-[60] flex max-w-[68vw] -translate-x-1/2 items-center gap-1.5 overflow-x-auto rounded-2xl border p-2 shadow-lg backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {windowed.map((asset) => {
        const isActive = asset.id === currentId
        return (
          <div key={asset.id} ref={isActive ? activeRef : undefined} className="flex shrink-0">
            <StripThumb asset={asset} active={isActive} onClick={() => onJump(asset.id)} />
          </div>
        )
      })}
    </motion.div>
  )
}

export default memo(Filmstrip)
