import { memo, useEffect, useRef, useState } from "react"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"
import { useThumbnail } from "./thumbnailStore"
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
  const src = useThumbnail(asset)
  const [failed, setFailed] = useState(false)
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
      {src && !failed ? (
        <img
          src={src}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : null}
    </button>
  )
}

interface FilmstripProps {
  assets: GridAsset[]
  currentId: string
  onJump: (id: string) => void
  leftInset: number
  rightInset: number
}

const RADIUS = 30

const Filmstrip = ({ assets, currentId, onJump, leftInset, rightInset }: FilmstripProps) => {
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
      style={{
        left: `calc(50% + ${(leftInset - rightInset) / 2}px)`,
        maxWidth: `calc(100vw - ${leftInset + rightInset + 48}px)`,
      }}
      className="bg-background/60 pointer-events-auto fixed bottom-20 z-[60] flex -translate-x-1/2 items-center gap-1.5 overflow-x-auto rounded-2xl border p-2 shadow-lg backdrop-blur-xl transition-[left,max-width] duration-300 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
