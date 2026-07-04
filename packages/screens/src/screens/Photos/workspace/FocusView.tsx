import { decryptName } from "@workspace/core/e2e"
import { favoriteAssets, trashAssets } from "@workspace/core/photos"
import { downloadItemFor } from "@workspace/core/photosE2e"
import { useUploadManager } from "@workspace/screens/uploadManager"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  CaretLeft,
  CaretRight,
  DotsThree,
  DownloadSimple,
  Heart,
  Info,
  Trash,
} from "@phosphor-icons/react"
import { cn } from "@workspace/ui/lib/utils"
import { AnimatePresence, motion } from "motion/react"
import { useTranslation } from "react-i18next"
import InfoPanel from "@pages/Photos/components/InfoPanel/InfoPanel"
import type { GridAsset } from "./types"

interface FocusViewProps {
  asset: GridAsset
  vp: { top: number; height: number; width: number }
  zoom: number
  info: boolean
  panelWidth: number
  hasPrev: boolean
  hasNext: boolean
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onToggleInfo: () => void
  onInvalidate?: () => void
}

const CHROME_FADE = { duration: 0.25, ease: [0.32, 0.72, 0, 1] as const }

/**
 * The floating chrome over a focused asset — backdrop (click to close), filename, ‹ › paging and the
 * action pill. It renders inside the workspace stage and positions itself in world coordinates from
 * the captured viewport, so it sits with the (scroll-locked) focused entity without a portal.
 */
const FocusView = ({
  asset,
  vp,
  zoom,
  info,
  panelWidth,
  hasPrev,
  hasNext,
  onClose,
  onPrev,
  onNext,
  onToggleInfo,
  onInvalidate,
}: FocusViewProps) => {
  const { t } = useTranslation("photos")
  const upload = useUploadManager()
  const name = (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename
  const zoomed = zoom > 1.02

  const favourite = () => {
    void favoriteAssets([asset.id], !asset.isFavorite).then(() => onInvalidate?.())
  }
  const download = () => upload.download(name, [downloadItemFor(asset)])
  const trash = () => {
    onClose()
    void trashAssets([asset.id]).then(() => onInvalidate?.())
  }

  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

  return (
    <>
      <div
        className="absolute inset-0 z-40"
        onClick={onClose}
        onPointerDown={(event) => event.stopPropagation()}
      />

      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={CHROME_FADE}
        onClick={stop}
        onPointerDown={stop}
        className="text-foreground/80 absolute z-[60] -translate-x-1/2 overflow-hidden rounded-full border bg-background/60 px-3 py-1 text-center text-xs font-medium shadow-sm backdrop-blur-md"
        style={{ top: vp.top + 16, left: vp.width / 2, maxWidth: "40%" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={zoomed ? "zoom" : "name"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className="block truncate tabular-nums"
          >
            {zoomed ? `${Math.round(zoom * 100)}%` : name}
          </motion.span>
        </AnimatePresence>
      </motion.div>

      {hasPrev ? (
        <div
          className="absolute z-[60] -translate-y-1/2"
          style={{ top: vp.top + vp.height / 2, left: 20 }}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("lightbox.previous")}
            onClick={onPrev}
            onPointerDown={stop}
            className="bg-background/40 hover:bg-background/60 border-border/40 size-10 rounded-full border shadow-lg backdrop-blur-2xl"
          >
            <CaretLeft className="size-5" />
          </Button>
        </div>
      ) : null}

      {hasNext ? (
        <div
          className="absolute z-[60] -translate-y-1/2"
          style={{ top: vp.top + vp.height / 2, left: vp.width - 20 - 40 }}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("lightbox.next")}
            onClick={onNext}
            onPointerDown={stop}
            className="bg-background/40 hover:bg-background/60 border-border/40 size-10 rounded-full border shadow-lg backdrop-blur-2xl"
          >
            <CaretRight className="size-5" />
          </Button>
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={CHROME_FADE}
        onClick={stop}
        onPointerDown={stop}
        className="absolute z-[60] flex items-center gap-0.5 rounded-full border bg-background/55 p-1 shadow-xl backdrop-blur-2xl"
        style={{ top: vp.top + vp.height - 60, right: (info ? panelWidth : 0) + 20 }}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("lightbox.favourite")}
          onClick={favourite}
          className="rounded-full"
        >
          <Heart
            weight={asset.isFavorite ? "fill" : "regular"}
            className={cn("size-[18px]", asset.isFavorite && "text-red-500")}
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
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={trash}>
              <Trash />
              {t("lightbox.moveToTrash")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      <AnimatePresence>
        {info ? (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={CHROME_FADE}
            onClick={stop}
            onPointerDown={stop}
            className="bg-sidebar absolute z-[60] overflow-y-auto rounded-2xl border shadow-xl"
            style={{
              top: vp.top + 8,
              left: vp.width - panelWidth + 8,
              width: Math.max(240, panelWidth - 16),
              height: vp.height - 16,
            }}
          >
            <InfoPanel assetId={asset.id} isFavorite={asset.isFavorite} onFavorite={favourite} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}

export default FocusView
