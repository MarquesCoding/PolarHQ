"use client"

import { type ReactNode, useState } from "react"
import { Icon } from "@lib/icons"
import { sharePhoto } from "@lib/photos"
import { useSelection } from "@lib/selection"
import { type DownloadItem, useUploadManager } from "@lib/uploadManager"
import { Button } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"
import { Separator } from "@workspace/ui/components/separator"
import { AnimatePresence, motion } from "motion/react"
import ShareDialog from "@components/ShareDialog/ShareDialog"

interface SelectionBarProps {
  children: ReactNode
  /** When provided, renders a Download action for these Photos (encrypted ones decrypt client-side). */
  downloadItems?: DownloadItem[]
  /** When provided (single selection), renders a Share action for this photo. */
  shareAssetId?: string
  shareName?: string
  shareEncrypted?: boolean
  /** Optional controlled share-dialog state (so a keybind can open it). */
  shareOpen?: boolean
  onShareOpenChange?: (open: boolean) => void
}

/** Shared floating selection action bar: count, clear, optional download/share, and app actions. */
const SelectionBar = ({
  children,
  downloadItems,
  shareAssetId,
  shareName,
  shareEncrypted,
  shareOpen: shareOpenProp,
  onShareOpenChange,
}: SelectionBarProps) => {
  const selection = useSelection()
  const upload = useUploadManager()
  const [internalShareOpen, setInternalShareOpen] = useState(false)
  const shareOpen = shareOpenProp ?? internalShareOpen
  const setShareOpen = onShareOpenChange ?? setInternalShareOpen

  const download = () => {
    if (!downloadItems || downloadItems.length === 0) return
    const name = downloadItems.length === 1 ? "Photo" : `${downloadItems.length} photos.zip`
    upload.download(name, downloadItems)
  }

  return (
    <>
      <AnimatePresence>
        {selection.count > 0 ? (
          <motion.div
            key="selection-bar"
            className="fixed inset-x-0 bottom-4 z-40 flex origin-bottom justify-center px-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 460, damping: 30 }}
          >
            <div className="panel flex items-center gap-1 rounded-full py-1.5 pr-3 pl-1.5 shadow-xl">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Clear selection"
                onClick={selection.clear}
                className="rounded-full"
              >
                <Icon name="xmark" className="size-4" />
              </Button>
              <span className="text-sm font-semibold tabular-nums">{selection.count}</span>
              <Separator orientation="vertical" className="mx-1 h-5" />
              {downloadItems ? (
                <Button variant="ghost" size="sm" onClick={download}>
                  <Icon name="download" className="size-4" />
                  Download
                  <Kbd>⇧W</Kbd>
                </Button>
              ) : null}
              {shareAssetId ? (
                <Button variant="ghost" size="sm" onClick={() => setShareOpen(true)}>
                  <Icon name="share" className="size-4" />
                  Share
                  <Kbd>⇧S</Kbd>
                </Button>
              ) : null}
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {shareAssetId ? (
        <ShareDialog
          name={shareName ?? "photo"}
          open={shareOpen}
          onOpenChange={setShareOpen}
          createLink={(options) => sharePhoto(shareAssetId, options)}
          encryptKeyId={shareEncrypted ? shareAssetId : undefined}
        />
      ) : null}
    </>
  )
}

export default SelectionBar
