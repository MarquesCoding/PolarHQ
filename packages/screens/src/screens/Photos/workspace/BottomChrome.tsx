import { decryptName } from "@workspace/core/e2e"
import { favoriteAssets, trashAssets } from "@workspace/core/photos"
import { downloadItemFor } from "@workspace/core/photosE2e"
import { useUploadManager } from "@workspace/screens/uploadManager"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Slider } from "@workspace/ui/components/slider"
import {
  ArrowsDownUp,
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
 * Workspace bottom chrome: a centered Grid/Canvas/Infinity switcher that morphs into the focused-photo
 * actions, plus a right-side tools cluster (inline size slider in grid mode + a sort menu).
 */
const BottomChrome = ({
  focusedAsset,
  showModes = true,
  showTools = true,
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
      <AnimatePresence>
        {!focused && showTools ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={FADE}
            className="pointer-events-none fixed right-5 bottom-5 z-[70] flex items-center gap-2"
          >
            {mode === "grid" ? (
              <div className={cn(PILL, "gap-2 px-3 py-1.5")}>
                <MagnifyingGlass className="text-muted-foreground size-4 shrink-0" />
                <Slider
                  value={[rowHeight]}
                  min={110}
                  max={340}
                  onValueChange={(value) =>
                    onRowHeight(Array.isArray(value) ? (value[0] ?? rowHeight) : value)
                  }
                  className="w-28"
                  aria-label={t("photoSize", { defaultValue: "Photo size" })}
                />
                <span className="text-muted-foreground w-9 shrink-0 text-right text-xs tabular-nums">
                  ×{(rowHeight / 180).toFixed(1)}
                </span>
              </div>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("sort", { defaultValue: "Sort" })}
                    className={cn(PILL, "size-10 justify-center rounded-full p-0")}
                  >
                    <ArrowsDownUp className="size-[18px]" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuLabel>{t("sort", { defaultValue: "Sort" })}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {SORTS.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.id}
                    checked={sort === option.id}
                    onCheckedChange={() => onSort(option.id)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {focused || showModes ? (
        <div className="pointer-events-none fixed bottom-5 left-1/2 z-[70] -translate-x-1/2">
          <motion.div layout transition={MORPH} className={PILL}>
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
      ) : null}
    </>
  )
}

export default BottomChrome
