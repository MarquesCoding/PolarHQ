import { decryptName } from "@workspace/core/e2e"
import { favoriteAssets, trashAssets } from "@workspace/core/photos"
import { downloadItemFor } from "@workspace/core/photosE2e"
import { useSelection } from "@workspace/screens/selection"
import { useUploadManager } from "@workspace/screens/uploadManager"
import { adaptiveChrome, useContentLight } from "@components/adaptiveChrome"
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
  CircleNotch,
  DotsThree,
  DownloadSimple,
  Heart,
  Info,
  MagnifyingGlass,
  SquaresFour,
  Trash,
} from "@phosphor-icons/react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
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
const FADE = { duration: 0.16, ease: [0.32, 0.72, 0, 1] as const }
const MORPH = { layout: { duration: 0.35, ease: [0.32, 0.72, 0, 1] as const } }
// Incoming morph content waits for the pill to finish widening before fading in (so icons don't
// appear over a half-full bar); outgoing content clears fast.
const REVEAL = { duration: 0.16, delay: 0.22, ease: [0.32, 0.72, 0, 1] as const }
const HIDE = { duration: 0.1 }

interface BottomChromeProps {
  focusedAsset: GridAsset | null
  showModes?: boolean
  showTools?: boolean
  /** True briefly while pinch/⌘-scroll resizing the grid — keeps the size slider revealed. */
  pinching?: boolean
  /** Left inset (sidebar width) so the centered switcher centers over the visible content, not the window. */
  leftInset?: number
  /** Width of the open details panel — the focused actions shift left by this so they don't overlap it. */
  detailsWidth?: number
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
  detailsWidth = 0,
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
  const selection = useSelection()
  const pillRef = useRef<HTMLDivElement>(null)
  const chrome = adaptiveChrome(useContentLight(pillRef))
  const selecting = selection.count > 0
  const [hovered, setHovered] = useState(false)
  const hoverTimer = useRef<number | undefined>(undefined)
  const [sortHovered, setSortHovered] = useState(false)
  const sortTimer = useRef<number | undefined>(undefined)
  const focused = focusedAsset
  const name = focused
    ? (focused.encrypted && decryptName(focused.encryptedName)) || focused.originalFilename
    : ""
  const downloadJob = focused
    ? upload.items.find(
        (item) =>
          item.kind === "download" &&
          item.status === "uploading" &&
          (item.assetId === focused.id || item.name === name),
      )
    : undefined

  const [dlState, setDlState] = useState<"idle" | "loading" | "done">("idle")
  useEffect(() => setDlState("idle"), [focused?.id])
  // Photo downloads are near-instant, so the manager's transient job flashes by unseen. Hold the
  // spinner a beat, then a checkmark, so the download action gives visible feedback regardless.
  useEffect(() => {
    if (dlState !== "loading" || downloadJob) return
    const timer = setTimeout(() => setDlState("done"), 500)
    return () => clearTimeout(timer)
  }, [dlState, downloadJob])
  useEffect(() => {
    if (dlState !== "done") return
    const timer = setTimeout(() => setDlState("idle"), 1300)
    return () => clearTimeout(timer)
  }, [dlState])

  const favourite = () => {
    if (focused) void favoriteAssets([focused.id], !focused.isFavorite).then(() => onInvalidate?.())
  }
  const download = () => {
    if (!focused || dlState === "loading") return
    setDlState("loading")
    upload.download(name, [downloadItemFor(focused)])
  }
  const trash = () => {
    if (!focused) return
    onClose()
    void trashAssets([focused.id]).then(() => onInvalidate?.())
  }

  return (
    <>
      {showTools && !selecting ? (
        <div
          className="pointer-events-none fixed bottom-5 z-[70] flex items-center gap-2 transition-[right] duration-300"
          style={{ right: focused && info ? detailsWidth + 20 : 20 }}
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
                className={cn(PILL, "relative h-10 gap-2.5 px-3.5")}
                onPointerEnter={() => {
                  window.clearTimeout(hoverTimer.current)
                  window.clearTimeout(sortTimer.current)
                  setSortHovered(false)
                  setHovered(true)
                }}
                onPointerLeave={() => {
                  hoverTimer.current = window.setTimeout(() => setHovered(false), 140)
                }}
              >
                <MagnifyingGlass className="text-muted-foreground size-4 shrink-0" />
                <AnimatePresence mode="popLayout" initial={false}>
                  {pinching && !hovered ? (
                    <motion.div
                      key="bar"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={FADE}
                      className="w-28 shrink-0"
                    >
                      <Slider
                        value={[rowHeight]}
                        min={110}
                        max={340}
                        onValueChange={(value) =>
                          onRowHeight(Array.isArray(value) ? (value[0] ?? rowHeight) : value)
                        }
                        aria-label={t("photoSize", { defaultValue: "Photo size" })}
                        slim
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
                <span className="text-muted-foreground shrink-0 text-right text-xs tabular-nums">
                  ×{(rowHeight / 180).toFixed(1)}
                </span>

                <AnimatePresence>
                  {hovered ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={FADE}
                      className="bg-background/90 absolute right-0 bottom-full mb-2 flex w-60 flex-col gap-3 rounded-2xl border p-3 shadow-xl backdrop-blur-2xl"
                    >
                      <div className="flex items-center gap-3">
                        <MagnifyingGlass className="text-muted-foreground size-4 shrink-0" />
                        <div className="flex-1">
                          <Slider
                            value={[rowHeight]}
                            min={110}
                            max={340}
                            onValueChange={(value) =>
                              onRowHeight(Array.isArray(value) ? (value[0] ?? rowHeight) : value)
                            }
                            aria-label={t("photoSize", { defaultValue: "Photo size" })}
                            slim
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <ArrowsHorizontal className="text-muted-foreground size-4 shrink-0" />
                        <div className="flex-1">
                          <Slider
                            value={[gap]}
                            min={0}
                            max={40}
                            onValueChange={(value) =>
                              onGap(Array.isArray(value) ? (value[0] ?? gap) : value)
                            }
                            aria-label={t("gap", { defaultValue: "Gap" })}
                            slim
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => onSquare(!square)}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition",
                            square
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/50",
                          )}
                        >
                          <SquaresFour weight={square ? "fill" : "regular"} className="size-4" />
                          {t("squareView", { defaultValue: "Square" })}
                        </button>
                        <button
                          type="button"
                          onClick={() => onHideDates(!hideDates)}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition",
                            hideDates
                              ? "bg-muted text-foreground"
                              : "text-muted-foreground hover:bg-muted/50",
                          )}
                        >
                          <CalendarBlank
                            weight={hideDates ? "fill" : "regular"}
                            className="size-4"
                          />
                          {t("hideDates", { defaultValue: "Hide dates" })}
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div
            ref={pillRef}
            layout
            transition={MORPH}
            style={{ borderRadius: 9999 }}
            className={cn(PILL, "h-10", focused && chrome)}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {focused && dlState !== "idle" ? (
                <motion.div
                  key="downloading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: HIDE }}
                  transition={REVEAL}
                  className="flex items-center gap-1.5 px-2.5"
                >
                  {dlState === "loading" ? (
                    <>
                      <CircleNotch className="size-[18px] shrink-0 animate-spin" />
                      <span className="text-xs font-medium whitespace-nowrap">
                        {t("lightbox.saving", { defaultValue: "Saving…" })}
                      </span>
                    </>
                  ) : (
                    <>
                      <Check weight="bold" className="size-[18px] shrink-0 text-emerald-400" />
                      <span className="text-xs font-medium whitespace-nowrap text-emerald-400">
                        {t("lightbox.saved", { defaultValue: "Saved" })}
                      </span>
                    </>
                  )}
                </motion.div>
              ) : focused ? (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: HIDE }}
                  transition={REVEAL}
                  className="flex items-center gap-0.5"
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("lightbox.favourite")}
                    onClick={favourite}
                    className="rounded-full"
                  >
                    <motion.span
                      key={focused.isFavorite ? "on" : "off"}
                      initial={{ scale: 0.4 }}
                      animate={{ scale: [0.4, 1.3, 1] }}
                      transition={{ type: "spring", stiffness: 500, damping: 13 }}
                      className="flex"
                    >
                      <Heart
                        weight={focused.isFavorite ? "fill" : "regular"}
                        className={cn("size-[18px]", focused.isFavorite && "text-rose-500")}
                      />
                    </motion.span>
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
                    <DropdownMenuContent
                      align="end"
                      side="top"
                      sideOffset={10}
                      className="bg-background/70 w-auto rounded-full border p-1 shadow-lg backdrop-blur-xl"
                    >
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={trash}
                        className="rounded-full px-3 py-1.5 whitespace-nowrap"
                      >
                        <Trash />
                        {t("lightbox.moveToTrash")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </motion.div>
              ) : (
                <motion.div
                  key="sort"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: HIDE }}
                  transition={REVEAL}
                  className="relative"
                  onPointerEnter={() => {
                    window.clearTimeout(sortTimer.current)
                    window.clearTimeout(hoverTimer.current)
                    setHovered(false)
                    setSortHovered(true)
                  }}
                  onPointerLeave={() => {
                    sortTimer.current = window.setTimeout(() => setSortHovered(false), 140)
                  }}
                >
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("sort", { defaultValue: "Sort" })}
                    className="rounded-full"
                  >
                    <ArrowsDownUp className="size-[18px]" />
                  </Button>
                  <AnimatePresence>
                    {sortHovered ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.97 }}
                        transition={FADE}
                        className="bg-background/90 absolute right-0 bottom-full mb-2 flex w-44 flex-col gap-0.5 rounded-2xl border p-1.5 shadow-xl backdrop-blur-2xl"
                      >
                        {SORTS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => onSort(option.id)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition",
                              sort === option.id
                                ? "bg-muted text-foreground"
                                : "text-muted-foreground hover:bg-muted/50",
                            )}
                          >
                            <span className="flex-1">{option.label}</span>
                            {sort === option.id ? <Check className="size-4 shrink-0" /> : null}
                          </button>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      ) : null}

      <AnimatePresence>
        {showModes && !focused && !selecting ? (
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
