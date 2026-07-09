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
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import InfoPanel from "@pages/Photos/components/InfoPanel/InfoPanel"
import { adaptiveChrome, useContentLight } from "@components/adaptiveChrome"
import type { GridAsset } from "./types"

interface FocusViewProps {
  asset: GridAsset
  vp: { top: number; height: number; width: number }
  zoom: number
  info: boolean
  panelWidth: number
  leftInset: number
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
  leftInset,
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
  const nameRef = useRef<HTMLDivElement>(null)
  const prevRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLDivElement>(null)
  const nameChrome = adaptiveChrome(useContentLight(nameRef))
  const prevChrome = adaptiveChrome(useContentLight(prevRef))
  const nextChrome = adaptiveChrome(useContentLight(nextRef))
  // Chrome aligns to the focused image, which is centered within [leftInset, vp.width - rightInset].
  const imgLeft = leftInset
  const imgRight = vp.width - (info ? panelWidth : 0)
  const imgCenter = (imgLeft + imgRight) / 2
  const name = (asset.encrypted && decryptName(asset.encryptedName)) || asset.originalFilename
  // Show the zoom % only while actively zooming; revert to the filename shortly after the user stops.
  const [zooming, setZooming] = useState(false)
  const zoomTimer = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (zoom <= 1.02) {
      setZooming(false)
      return
    }
    setZooming(true)
    window.clearTimeout(zoomTimer.current)
    zoomTimer.current = window.setTimeout(() => setZooming(false), 900)
    return () => window.clearTimeout(zoomTimer.current)
  }, [zoom])

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={CHROME_FADE}
        className="bg-background/45 fixed inset-0 z-40 backdrop-blur"
        onClick={onClose}
        onPointerDown={(event) => event.stopPropagation()}
      />

      <motion.div
        ref={nameRef}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={CHROME_FADE}
        onClick={stop}
        onPointerDown={stop}
        className={cn(
          "absolute z-[60] -translate-x-1/2 overflow-hidden rounded-full border px-3 py-1 text-center text-xs font-medium shadow-sm",
          nameChrome,
        )}
        style={{ top: vp.top + 16, left: imgCenter, maxWidth: "40%" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={zooming ? "zoom" : "name"}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className="block truncate tabular-nums"
          >
            {zooming ? `${Math.round(zoom * 100)}%` : name}
          </motion.span>
        </AnimatePresence>
      </motion.div>

      {hasPrev ? (
        <div
          ref={prevRef}
          className="absolute z-[60] -translate-y-1/2"
          style={{ top: vp.top + vp.height / 2, left: imgLeft + 20 }}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("lightbox.previous")}
            onClick={onPrev}
            onPointerDown={stop}
            className={cn("size-10 rounded-full border shadow-lg hover:opacity-90", prevChrome)}
          >
            <CaretLeft className="size-5" />
          </Button>
        </div>
      ) : null}

      {hasNext ? (
        <div
          ref={nextRef}
          className="absolute z-[60] -translate-y-1/2"
          style={{ top: vp.top + vp.height / 2, left: imgRight - 20 - 40 }}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("lightbox.next")}
            onClick={onNext}
            onPointerDown={stop}
            className={cn("size-10 rounded-full border shadow-lg hover:opacity-90", nextChrome)}
          >
            <CaretRight className="size-5" />
          </Button>
        </div>
      ) : null}

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
            className="bg-sidebar absolute z-[60] overflow-hidden rounded-2xl border shadow-xl"
            style={{
              top: vp.top + 8,
              left: vp.width - 8 - Math.max(240, panelWidth - 16),
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
