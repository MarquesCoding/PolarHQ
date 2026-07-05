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
import { Slider } from "@workspace/ui/components/slider"
import {
  ArrowsDownUp,
  ArrowsHorizontal,
  CalendarBlank,
  Check,
  DotsThree,
  DownloadSimple,
  Heart,
  Info,
  MagnifyingGlass,
  SquaresFour,
  Trash,
} from "@phosphor-icons/react"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "react-i18next"
import type { GridAsset, Mode, SortKey } from "./types"

const MODES: { id: Mode; label: string }[] = [
  { id: "grid", label: "Grid" },
  { id: "canvas", label: "Canvas" },
  { id: "infinity", label: "Infinity" },
]
const SORTS: { id: SortKey; label: string }[] = [
  { id: "date-desc", label: "Newest first" },
  { id: "date-asc", label: "Oldest first" },
  { id: "name-asc", label: "Name (A–Z)" },
  { id: "name-desc", label: "Name (Z–A)" },
]

const PILL =
  "bg-background/70 pointer-events-auto flex items-center rounded-full border p-1 shadow-lg backdrop-blur-xl"
const SLIDER =
  "[&_[data-slot=slider-track]]:h-[7px] [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-range]]:rounded-full [&_[data-slot=slider-range]]:bg-white/85 [&_[data-slot=slider-thumb]]:opacity-0"
const FADE = { duration: 0.16, ease: [0.32, 0.72, 0, 1] as const }
const MORPH = { layout: { duration: 0.35, ease: [0.32, 0.72, 0, 1] as const } }

interface BottomChromeProps {
  focusedAsset: GridAsset | null
  showModes?: boolean
  showTools?: boolean
  /** True briefly while pinch/⌘-scroll resizing the grid — keeps the size slider revealed. */
  pinching?: boolean
  /** Left inset (sidebar width) so the centered switcher centers over the visible content, not the window. */
  leftInset?: number
  mode: Mode
  onMode: (mode: Mode) => void
  rowHeight: number
  onRowHeight: (value: number) => void
  gap: number
  onGap: (value: number) => void
  square: boolean
  onSquare: (value: boolean) => void
  hideDates: boolean
  onHideDates: (value: boolean) => void
  sort: SortKey
  onSort: (value: SortKey) => void
  info: boolean
  onToggleInfo: () => void
  onClose: () => void
  onInvalidate?: () => void
}

/**
 * Workspace bottom chrome. Center: a Grid/Canvas/Infinity switcher (fades out on focus, never morphs).
 * Right: the size slider (grid) plus a pill that liquid-morphs between the sort menu and the focused
 * photo actions (favourite / download / details / more).
 */
const BottomChrome = ({
  focusedAsset,
  showModes = true,
  showTools = true,
  pinching = false,
  leftInset = 0,
  mode,
  onMode,
  rowHeight,
  onRowHeight,
  gap,
  onGap,
  square,
  onSquare,
  hideDates,
  onHideDates,
  sort,
  onSort,
  info,
  onToggleInfo,
  onClose,
  onInvalidate,
}: BottomChromeProps) => {
  const { t } = useTranslation("photos")
  const upload = useUploadManager()
  const [hovered, setHovered] = useState(false)
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
    <>
      {showTools ? (
        <div
          className="fixed right-5 bottom-5 z-[70] flex items-center gap-2"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <AnimatePresence>
            {!focused && mode === "grid" ? (
              <motion.div
                key="slider"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={FADE}
                style={{ borderRadius: 9999 }}
                className={cn(PILL, "h-10 gap-2.5 px-3.5")}
              >
                <MagnifyingGlass className="text-muted-foreground size-4 shrink-0" />
                <AnimatePresence mode="popLayout" initial={false}>
                  {hovered || pinching ? (
                    <motion.div
                      key="controls"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={FADE}
                      className="flex items-center gap-2.5"
                    >
                      <div className="w-28 shrink-0">
                        <Slider
                          value={[rowHeight]}
                          min={110}
                          max={340}
                          onValueChange={(value) =>
                            onRowHeight(Array.isArray(value) ? (value[0] ?? rowHeight) : value)
                          }
                          aria-label={t("photoSize", { defaultValue: "Photo size" })}
                          className={SLIDER}
                        />
                      </div>
                      {hovered ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onSquare(!square)}
                            aria-label={t("squareView", { defaultValue: "Square crop" })}
                            className={cn(
                              "shrink-0 rounded-full p-1.5 transition",
                              square
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <SquaresFour
                              weight={square ? "fill" : "regular"}
                              className="size-[18px]"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => onHideDates(!hideDates)}
                            aria-label={t("hideDates", { defaultValue: "Hide dates" })}
                            className={cn(
                              "shrink-0 rounded-full p-1.5 transition",
                              hideDates
                                ? "text-muted-foreground/50 hover:text-muted-foreground"
                                : "bg-muted text-foreground",
                            )}
                          >
                            <CalendarBlank
                              weight={hideDates ? "regular" : "fill"}
                              className="size-[18px]"
                            />
                          </button>
                          <ArrowsHorizontal className="text-muted-foreground size-4 shrink-0" />
                          <div className="w-16 shrink-0">
                            <Slider
                              value={[gap]}
                              min={0}
                              max={40}
                              onValueChange={(value) =>
                                onGap(Array.isArray(value) ? (value[0] ?? gap) : value)
                              }
                              aria-label={t("gap", { defaultValue: "Gap" })}
                              className={SLIDER}
                            />
                          </div>
                        </>
                      ) : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <span className="text-muted-foreground shrink-0 text-right text-xs tabular-nums">
                  ×{(rowHeight / 180).toFixed(1)}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div
            layout
            transition={MORPH}
            style={{ borderRadius: 9999 }}
            className={cn(PILL, "h-10")}
          >
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
                  key="sort"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={FADE}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("sort", { defaultValue: "Sort" })}
                          className="rounded-full"
                        >
                          <ArrowsDownUp className="size-[18px]" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" side="top">
                      {SORTS.map((option) => (
                        <DropdownMenuItem key={option.id} onClick={() => onSort(option.id)}>
                          {option.label}
                          {sort === option.id ? <Check className="ms-auto size-4" /> : null}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      ) : null}

      <AnimatePresence>
        {showModes && !focused ? (
          <motion.div
            key="modes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={FADE}
            className="pointer-events-none fixed bottom-5 z-[70] -translate-x-1/2"
            style={{ left: `calc(50% + ${leftInset / 2}px)` }}
          >
            <div className={cn(PILL, "h-10")}>
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
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

export default BottomChrome
