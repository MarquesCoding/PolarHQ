import { decryptName } from "@workspace/core/e2e"
import { favoriteAssets, trashAssets } from "@workspace/core/photos"
import { downloadItemFor } from "@workspace/core/photosE2e"
import { useUploadManager } from "@workspace/screens/uploadManager"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { DotsThree, DownloadSimple, Heart, Info, Trash } from "@phosphor-icons/react"
import { AnimatePresence, motion } from "motion/react"
import { type CSSProperties } from "react"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "react-i18next"
import SizeControl from "@pages/Photos/components/SizeControl/SizeControl"
import type { GridAsset, Mode } from "./types"

const MODES: { id: Mode; label: string }[] = [
  { id: "grid", label: "Grid" },
  { id: "canvas", label: "Canvas" },
  { id: "infinity", label: "Infinity" },
]

const PILL = "pointer-events-auto flex items-center rounded-full p-1"
const GLASS: CSSProperties = {
  background: "color-mix(in oklab, var(--background) 42%, transparent)",
  backdropFilter: "blur(6px) saturate(1.8) brightness(1.06) url(#photos-liquid-glass)",
  WebkitBackdropFilter: "blur(6px) saturate(1.8) brightness(1.06)",
  boxShadow:
    "inset 0 1px 1px 0 rgb(255 255 255 / 0.5), inset 0 0 0 1px rgb(255 255 255 / 0.08), inset 0 -10px 14px -10px rgb(255 255 255 / 0.18), 0 12px 32px -8px rgb(0 0 0 / 0.42)",
}
const FADE = { duration: 0.16, ease: [0.32, 0.72, 0, 1] as const }
const MORPH = { layout: { duration: 0.35, ease: [0.32, 0.72, 0, 1] as const } }

interface BottomChromeProps {
  focusedAsset: GridAsset | null
  mode: Mode
  onMode: (mode: Mode) => void
  rowHeight: number
  onRowHeight: (value: number) => void
  gap: number
  onGap: (value: number) => void
  square: boolean
  onSquare: (value: boolean) => void
  info: boolean
  onToggleInfo: () => void
  onClose: () => void
  onInvalidate?: () => void
}

/**
 * The single bottom-right control pill for the whole workspace. It liquid-morphs between the grid
 * controls (Grid/Canvas/Infinity switcher) and the focused-photo actions (favourite / download /
 * details / more) — one element whose width animates while its contents crossfade.
 */
const BottomChrome = ({
  focusedAsset,
  mode,
  onMode,
  rowHeight,
  onRowHeight,
  gap,
  onGap,
  square,
  onSquare,
  info,
  onToggleInfo,
  onClose,
  onInvalidate,
}: BottomChromeProps) => {
  const { t } = useTranslation("photos")
  const upload = useUploadManager()
  const focused = focusedAsset
  const name = focused
    ? (focused.encrypted && decryptName(focused.encryptedName)) || focused.originalFilename
    : ""

  const favourite = () => {
    if (focused) void favoriteAssets([focused.id], !focused.isFavorite).then(() => onInvalidate?.())
  }
  const download = () => {
    if (focused) upload.download(name, [downloadItemFor(focused)])
  }
  const trash = () => {
    if (!focused) return
    onClose()
    void trashAssets([focused.id]).then(() => onInvalidate?.())
  }

  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-[70] flex items-center gap-2">
      <svg aria-hidden width="0" height="0" className="absolute">
        <filter id="photos-liquid-glass" x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.012" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.4" result="blurred" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurred"
            scale="20"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>
      <AnimatePresence>
        {!focused && mode === "grid" ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={FADE}
            className={PILL}
            style={GLASS}
          >
            <SizeControl
              value={rowHeight}
              onChange={onRowHeight}
              gap={gap}
              onGapChange={onGap}
              square={square}
              onSquareChange={onSquare}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div layout transition={MORPH} className={PILL} style={GLASS}>
        <AnimatePresence mode="popLayout" initial={false}>
          {focused ? (
            <motion.div
              key="actions"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={FADE}
              className="flex items-center gap-0.5"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("lightbox.favourite")}
                onClick={favourite}
                className="rounded-full"
              >
                <Heart
                  weight={focused.isFavorite ? "fill" : "regular"}
                  className={cn("size-[18px]", focused.isFavorite && "text-red-500")}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("lightbox.download")}
                onClick={download}
                className="rounded-full"
              >
                <DownloadSimple className="size-[18px]" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("lightbox.info")}
                onClick={onToggleInfo}
                className={cn("rounded-full", info && "bg-muted")}
              >
                <Info className="size-[18px]" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("lightbox.more")}
                      className="rounded-full"
                    >
                      <DotsThree className="size-5" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" side="top">
                  <DropdownMenuItem variant="destructive" onClick={trash}>
                    <Trash />
                    {t("lightbox.moveToTrash")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ) : (
            <motion.div
              key="modes"
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={FADE}
              className="flex items-center"
            >
              {MODES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onMode(item.id)}
                  className={cn(
                    "relative rounded-full px-4 py-1.5 text-sm font-medium transition",
                    mode === item.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode === item.id ? (
                    <motion.span
                      layoutId="workspace-mode-pill"
                      className="bg-muted absolute inset-0 rounded-full"
                      transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                    />
                  ) : null}
                  <span className="relative">
                    {t(`modes.${item.id}`, { defaultValue: item.label })}
                  </span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default BottomChrome
