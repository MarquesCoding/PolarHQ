"use client"

import { useEffect, useState } from "react"
import type { DriveNode } from "@lib/drive"
import { Icon } from "@lib/icons"
import { Button } from "@workspace/ui/components/button"
import { motion } from "motion/react"

interface ImageViewerProps {
  node: DriveNode
  onClose: () => void
}

/** Full-screen image viewer (zoom/pan-lite) styled like the Photos lightbox, for Drive images. */
const ImageViewer = ({ node, onClose }: ImageViewerProps) => {
  const [scale, setScale] = useState(1)
  const src = node.downloadUrl ?? node.thumbnailUrl ?? undefined

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const download = () => {
    if (!node.downloadUrl) return
    const anchor = document.createElement("a")
    anchor.href = node.downloadUrl
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
            aria-label="Close"
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
            aria-label="Zoom out"
            onClick={() => setScale((value) => Math.max(0.25, Number((value - 0.25).toFixed(2))))}
            className="rounded-full"
          >
            <Icon name="minus" className="size-4" />
          </Button>
          <span className="w-11 text-center text-xs font-semibold tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            onClick={() => setScale((value) => Math.min(3, Number((value + 0.25).toFixed(2))))}
            className="rounded-full"
          >
            <Icon name="plus" className="size-4" />
          </Button>
          <span className="bg-border mx-0.5 h-5 w-px" />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Reset zoom"
            onClick={() => setScale(1)}
            className="rounded-full"
          >
            <Icon name="zoom-reset" className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Download"
            onClick={download}
            className="rounded-full"
          >
            <Icon name="download" className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden p-6 sm:p-10" onClick={onClose}>
        {src ? (
          <motion.img
            src={src}
            alt={node.name}
            draggable={false}
            animate={{ scale }}
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
