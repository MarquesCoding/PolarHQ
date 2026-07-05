import { decryptName } from "@workspace/core/e2e"
import { favoriteAssets, trashAssets } from "@workspace/core/photos"
import { downloadItemFor } from "@workspace/core/photosE2e"
import { useUploadManager } from "@workspace/screens/uploadManager"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Slider } from "@workspace/ui/components/slider"
import {
  ArrowsDownUp,
  Check,
  DotsThree,
  DownloadSimple,
  Heart,
  Info,
  MagnifyingGlass,
  Trash,
} from "@phosphor-icons/react"
import { AnimatePresence, motion } from "motion/react"
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

interface BottomChromeProps {
  focusedAsset: GridAsset | null
  showModes?: boolean
  showTools?: boolean
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
  leftInset = 0,
  mode,
  onMode,
  rowHeight,
  onRowHeight,
  sort,
  onSort,
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
    <>
      {showTools ? (
        <div className="pointer-events-none fixed right-5 bottom-5 z-[70] flex items-center gap-2">
          <AnimatePresence>
            {!focused && mode === "grid" ? (
              <motion.div
                key="slider"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={FADE}
                className={cn(PILL, "h-10 gap-2.5 px-3.5")}
              >
                <MagnifyingGlass className="text-muted-foreground size-4 shrink-0" />
                <div className="w-32 shrink-0">
                  <Slider
                    value={[rowHeight]}
                    min={110}
                    max={340}
                    onValueChange={(value) =>
                      onRowHeight(Array.isArray(value) ? (value[0] ?? rowHeight) : value)
                    }
                    aria-label={t("photoSize", { defaultValue: "Photo size" })}
                  />
                </div>
                <span className="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
                  ×{(rowHeight / 180).toFixed(1)}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div layout transition={MORPH} className={cn(PILL, "h-10")}>
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
                      <DropdownMenuLabel>{t("sort", { defaultValue: "Sort" })}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
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
