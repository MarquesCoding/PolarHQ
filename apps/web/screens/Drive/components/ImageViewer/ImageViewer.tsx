"use client"

import { useEffect, useState } from "react"
import type { DriveNode } from "@lib/drive"
import { fetchDecryptedFile } from "@lib/driveE2e"
import { Icon } from "@lib/icons"
import { useZoomPan } from "@lib/useZoomPan"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"

interface ImageViewerProps {
  node: DriveNode
  onClose: () => void
}

/** Full-screen image viewer with pinch / wheel / button zoom and drag-to-pan, for Drive images. */
const ImageViewer = ({ node, onClose }: ImageViewerProps) => {
  const { t } = useTranslation("drive")
  const zoom = useZoomPan(node.id)
  const [decrypted, setDecrypted] = useState<string | null>(null)
  const src = node.encrypted ? (decrypted ?? undefined) : (node.downloadUrl ?? node.thumbnailUrl ?? undefined)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    if (!node.encrypted || !node.downloadUrl) return
    let url: string | null = null
    let cancelled = false
    void fetchDecryptedFile(node.id, node.downloadUrl, node.mimeType).then((decryptedUrl) => {
      if (cancelled) {
        if (decryptedUrl) URL.revokeObjectURL(decryptedUrl)
        return
      }
      url = decryptedUrl
      setDecrypted(decryptedUrl)
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [node.id, node.encrypted, node.downloadUrl, node.mimeType])

  const download = () => {
    if (!src) return
    const anchor = document.createElement("a")
    anchor.href = src
    anchor.download = node.name
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  return (
    <motion.div
      className="bg-background/80 fixed inset-0 z-50 flex flex-col backdrop-blur-2xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-2 p-3" onClick={(event) => event.stopPropagation()}>
        <div className="panel flex min-w-0 items-center gap-1.5 rounded-full p-1 pr-3 shadow-lg">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("imageViewer.close")}
            onClick={onClose}
            className="rounded-full"
          >
            <Icon name="xmark" className="size-5" />
          </Button>
          <span className="max-w-[40vw] truncate text-xs font-medium">{node.name}</span>
        </div>

        <div className="panel flex items-center gap-0.5 rounded-full p-1 shadow-lg">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("imageViewer.zoomOut")}
            onClick={zoom.zoomOut}
            className="rounded-full"
          >
            <Icon name="minus" className="size-4" />
          </Button>
          <span className="w-11 text-center text-xs font-semibold tabular-nums">
            {Math.round(zoom.scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("imageViewer.zoomIn")}
            onClick={zoom.zoomIn}
            className="rounded-full"
          >
            <Icon name="plus" className="size-4" />
          </Button>
          <span className="bg-border mx-0.5 h-5 w-px" />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("imageViewer.resetZoom")}
            onClick={zoom.reset}
            className="rounded-full"
          >
            <Icon name="zoom-reset" className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("imageViewer.download")}
            onClick={download}
            className="rounded-full"
          >
            <Icon name="download" className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={zoom.stageRef}
        className={cn(
          "flex flex-1 items-center justify-center overflow-hidden p-6 touch-none sm:p-10",
          zoom.canPan && "cursor-grab active:cursor-grabbing",
        )}
        onClick={onClose}
        onPointerDown={zoom.stageHandlers.onPointerDown}
        onPointerMove={zoom.stageHandlers.onPointerMove}
        onPointerUp={zoom.stageHandlers.onPointerUp}
        onPointerCancel={zoom.stageHandlers.onPointerCancel}
      >
        {src ? (
          <motion.img
            src={src}
            alt={node.name}
            draggable={false}
            animate={{ scale: zoom.scale, x: zoom.offset.x, y: zoom.offset.y }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
          />
        ) : null}
      </div>
    </motion.div>
  )
}

export default ImageViewer
