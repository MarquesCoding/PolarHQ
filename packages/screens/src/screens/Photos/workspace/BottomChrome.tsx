import { decryptName } from "@workspace/core/e2e"
import { getHost } from "@workspace/core/host"
import { favoriteAssets, trashAssets } from "@workspace/core/photos"
import {
  downloadItemFor,
  fetchDecryptedSplat,
  removeSplat,
  uploadSplat,
} from "@workspace/core/photosE2e"
import { useSelection } from "@workspace/screens/selection"
import { useUploadManager } from "@workspace/screens/uploadManager"
import { useSidebar } from "@workspace/ui/components/sidebar"
import { adaptiveChrome, useContentLight } from "@components/adaptiveChrome"
import { fetchCachedOriginal } from "@pages/Photos/components/Lightbox/originalCache"
import { onPhotoNotice } from "./notice"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
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
  Cube,
  DotsThree,
  DownloadSimple,
  FilmStrip,
  Heart,
  Info,
  MagnifyingGlass,
  SquaresFour,
  Trash,
} from "@phosphor-icons/react"
import { AnimatePresence, motion } from "motion/react"
import { Suspense, lazy, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "react-i18next"
import type { GridAsset, Mode, SortKey } from "./types"

const SplatResult = lazy(() => import("@pages/Drive/components/ModelViewer/SplatResult"))

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

/** Average perceived brightness of an image blob (downsampled), for the splat viewer's adaptive
 *  chrome — `true` when the photo is bright (so the viewer uses dark pills, and vice-versa). */
const averageLight = async (blob: Blob): Promise<boolean> => {
  try {
    const bitmap = await createImageBitmap(blob)
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 10
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) {
      bitmap.close()
      return true
    }
    ctx.drawImage(bitmap, 0, 0, 10, 10)
    bitmap.close()
    const { data } = ctx.getImageData(0, 0, 10, 10)
    let sum = 0
    for (let i = 0; i < data.length; i += 4)
      sum += (0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!) / 255
    return sum / (data.length / 4) > 0.6
  } catch {
    return true
  }
}
const FADE = { duration: 0.16, ease: [0.32, 0.72, 0, 1] as const }
const MORPH = { layout: { duration: 0.35, ease: [0.32, 0.72, 0, 1] as const } }
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
  strip: boolean
  onToggleStrip: () => void
  onClose: () => void
  onInvalidate?: () => void
  onFavourite?: (ids: string[], next: boolean) => void
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
  strip,
  onToggleStrip,
  onClose,
  onInvalidate,
  onFavourite,
}: BottomChromeProps) => {
  const { t } = useTranslation("photos")
  const upload = useUploadManager()
  const selection = useSelection()
  const pillRef = useRef<HTMLDivElement>(null)
  const chrome = adaptiveChrome(useContentLight(pillRef))
  const [pillW, setPillW] = useState<number | undefined>()
  useEffect(() => {
    const el = pillRef.current
    if (!el) return
    const observer = new ResizeObserver(() => setPillW(el.offsetWidth))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)
  useEffect(
    () =>
      onPhotoNotice((message) => {
        setNotice(message)
        window.clearTimeout(noticeTimer.current)
        noticeTimer.current = window.setTimeout(() => setNotice(null), 2200)
      }),
    [],
  )
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
    if (!focused) return
    if (onFavourite) onFavourite([focused.id], !focused.isFavorite)
    else void favoriteAssets([focused.id], !focused.isFavorite).then(() => onInvalidate?.())
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

  const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar()
  const sidebarBeforeSplat = useRef(false)
  const [splatSrc, setSplatSrc] = useState<{ url: string; name: string; light?: boolean } | null>(
    null,
  )
  const [splatBusy, setSplatBusy] = useState<null | "generate" | "load">(null)
  const [setupPhase, setSetupPhase] = useState<string | null>(null)
  const splatActive = splatBusy !== null || Boolean(splatSrc)
  useEffect(() => {
    if (splatActive) {
      setSidebarOpen(false)
    } else if (sidebarBeforeSplat.current) {
      setSidebarOpen(true)
      sidebarBeforeSplat.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splatActive])
  const hasSplat = Boolean(focused?.splat)
  const canGenerate3d =
    Boolean(focused?.mimeType?.startsWith("image/")) &&
    getHost().isDesktop &&
    Boolean(getHost().generateSplat)
  const splatName = () => `${name.replace(/\.[^.]+$/, "")}.ply`

  const runSharpSetup = async () => {
    const host = getHost()
    if (!host.sharpSetup) return
    try {
      await host.sharpSetup((phase) => setSetupPhase(phase))
      setSetupPhase(null)
      void generate3d()
    } catch {
      setSetupPhase(null)
      toast.error(t("lightbox.generate3dFailed"))
    }
  }

  const generate3d = async () => {
    const host = getHost()
    if (!focused || !host.generateSplat || splatBusy) return
    if (host.sharpAvailable && !(await host.sharpAvailable())) {
      setSetupPhase("prompt")
      return
    }
    const assetId = focused.id
    const mimeType = focused.mimeType
    const outName = splatName()
    sidebarBeforeSplat.current = sidebarOpen
    setSplatBusy("generate")
    try {
      const url = await fetchCachedOriginal(assetId, mimeType)
      if (!url) throw new Error("no source")
      const blob = await fetch(url).then((response) => response.blob())
      const light = await averageLight(blob)
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const splat = await host.generateSplat(bytes, blob.type || mimeType || "image/jpeg")
      setSplatSrc({ url: splat, name: outName, light })
      const plyBuffer = await fetch(splat).then((response) => response.arrayBuffer())
      void uploadSplat(assetId, new Uint8Array(plyBuffer)).then((ok) => ok && onInvalidate?.())
    } catch {
      toast.error(t("lightbox.generate3dFailed"))
    } finally {
      setSplatBusy(null)
    }
  }

  const viewStoredSplat = async () => {
    if (!focused || splatBusy) return
    const assetId = focused.id
    const mimeType = focused.mimeType
    const outName = splatName()
    sidebarBeforeSplat.current = sidebarOpen
    setSplatBusy("load")
    try {
      const [url, sourceUrl] = await Promise.all([
        fetchDecryptedSplat(assetId),
        fetchCachedOriginal(assetId, mimeType),
      ])
      if (!url) throw new Error("no splat")
      const light = sourceUrl
        ? await averageLight(await fetch(sourceUrl).then((response) => response.blob()))
        : undefined
      setSplatSrc({ url, name: outName, light })
    } catch {
      toast.error(t("lightbox.generate3dFailed"))
    } finally {
      setSplatBusy(null)
    }
  }

  const removeStoredSplat = async () => {
    if (!focused) return
    const ok = await removeSplat(focused.id)
    if (ok) {
      toast(t("lightbox.splatRemoved", { defaultValue: "3D removed" }))
      onInvalidate?.()
    }
  }

  return (
    <>
      {showTools && !selecting ? (
        <div
          className="pointer-events-none fixed bottom-5 z-[70] flex items-center gap-2 transition-[right] duration-300"
          style={{ right: focused && info ? detailsWidth + 20 : 20 }}
        >
          <AnimatePresence>
            {focused && dlState !== "idle" ? (
              <motion.div
                key="downloading"
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={FADE}
                style={{ width: pillW }}
                className={cn(
                  "absolute right-0 bottom-full mb-2 flex h-10 items-center gap-2 rounded-full border px-3.5 shadow-lg",
                  chrome,
                )}
              >
                {dlState === "loading" ? (
                  <>
                    <CircleNotch className="size-[18px] shrink-0 animate-spin" />
                    <span className="truncate text-sm font-medium">
                      {t("lightbox.saving", { defaultValue: "Saving…" })}
                    </span>
                  </>
                ) : (
                  <>
                    <Check weight="bold" className="size-[18px] shrink-0 text-emerald-400" />
                    <span className="truncate text-sm font-medium">
                      {t("lightbox.saved", { defaultValue: "Saved" })}
                    </span>
                  </>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
          <AnimatePresence>
            {!focused && mode === "grid" && !notice ? (
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
              {notice && !focused ? (
                <motion.div
                  key="notice"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: HIDE }}
                  transition={REVEAL}
                  className="flex items-center gap-1.5 px-3"
                >
                  <Check weight="bold" className="size-[18px] shrink-0 text-emerald-400" />
                  <span className="text-sm font-medium whitespace-nowrap">{notice}</span>
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
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("lightbox.filmstrip", { defaultValue: "Filmstrip" })}
                    onClick={onToggleStrip}
                    className={cn("rounded-full", strip && "bg-muted")}
                  >
                    <FilmStrip className="size-[18px]" />
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
                      style={{ width: pillW }}
                      className={cn("rounded-full border p-1 shadow-lg", chrome)}
                    >
                      {hasSplat ? (
                        <>
                          <DropdownMenuItem
                            onClick={() => void viewStoredSplat()}
                            className="h-8 justify-center gap-1.5 rounded-full whitespace-nowrap focus:bg-white/10"
                          >
                            <Cube className="size-[18px]" />
                            {t("lightbox.viewSplat", { defaultValue: "View 3D splat" })}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => void removeStoredSplat()}
                            className="h-8 justify-center gap-1.5 rounded-full whitespace-nowrap focus:bg-white/10"
                          >
                            <Trash className="size-[18px]" />
                            {t("lightbox.removeSplat", { defaultValue: "Remove 3D" })}
                          </DropdownMenuItem>
                        </>
                      ) : canGenerate3d ? (
                        <DropdownMenuItem
                          onClick={() => void generate3d()}
                          className="h-8 justify-center gap-1.5 rounded-full whitespace-nowrap focus:bg-white/10"
                        >
                          <Cube className="size-[18px]" />
                          {t("lightbox.generate3d")}
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem
                        onClick={trash}
                        className="h-8 justify-center gap-1.5 rounded-full whitespace-nowrap focus:bg-white/10"
                      >
                        <Trash className="size-[18px]" />
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

      <Dialog
        open={setupPhase !== null}
        onOpenChange={(open) => {
          if (!open && setupPhase === "prompt") setSetupPhase(null)
        }}
      >
        <DialogContent showCloseButton={setupPhase === "prompt"} className="sm:max-w-sm">
          {setupPhase === "prompt" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("lightbox.setup3dTitle", { defaultValue: "Set up 3D" })}</DialogTitle>
                <DialogDescription>
                  {t("lightbox.setup3dBody", {
                    defaultValue:
                      "Generating 3D uses Apple SHARP — a one-time ~5 GB setup (runtime + model) that runs entirely on your device.",
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  {t("common:cancel", { defaultValue: "Cancel" })}
                </DialogClose>
                <Button onClick={() => void runSharpSetup()}>
                  {t("lightbox.setup3dConfirm", { defaultValue: "Set up 3D" })}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CircleNotch className="size-6 animate-spin" />
              <span className="text-sm font-medium">
                {setupPhase === "installing-uv"
                  ? t("lightbox.setup3dUv", { defaultValue: "Installing tools…" })
                  : setupPhase === "downloading-sharp"
                    ? t("lightbox.setup3dSharp", { defaultValue: "Downloading SHARP…" })
                    : setupPhase === "creating-env"
                      ? t("lightbox.setup3dEnv", { defaultValue: "Preparing environment…" })
                      : setupPhase === "installing-deps"
                        ? t("lightbox.setup3dDeps", { defaultValue: "Installing dependencies…" })
                        : setupPhase === "downloading-model"
                          ? t("lightbox.setup3dModel", {
                              defaultValue: "Downloading model (~2.6 GB)…",
                            })
                          : t("lightbox.generating3d")}
              </span>
              <span className="text-muted-foreground text-xs">
                {t("lightbox.setup3dHint", { defaultValue: "This can take a few minutes." })}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {splatBusy ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="panel flex items-center gap-2.5 rounded-full px-4 py-2.5 shadow-xl">
            <CircleNotch className="size-[18px] animate-spin" />
            <span className="text-sm font-medium">
              {splatBusy === "generate"
                ? t("lightbox.generating3d")
                : t("lightbox.loading3d", { defaultValue: "Loading 3D…" })}
            </span>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {splatSrc ? (
          <Suspense key="splat" fallback={null}>
            <SplatResult splat={splatSrc} onClose={() => setSplatSrc(null)} />
          </Suspense>
        ) : null}
      </AnimatePresence>
    </>
  )
}

export default BottomChrome
