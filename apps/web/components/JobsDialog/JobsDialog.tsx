"use client"

import { Icon } from "@lib/icons"
import { type UploadItem, useUploadManager } from "@lib/uploadManager"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { AnimatePresence } from "motion/react"
import { useTranslation } from "react-i18next"
import { JobRow } from "@components/UploadPanel/jobRow"

interface JobsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const isActive = (item: UploadItem): boolean =>
  item.status === "uploading" || item.status === "processing"

/** First-class, on-demand view of all background jobs (uploads, downloads, archives), grouped into
 *  active and finished. The bottom-right tray gives transient feedback; this is the persistent one. */
const JobsDialog = ({ open, onOpenChange }: JobsDialogProps) => {
  const { t } = useTranslation("common")
  const { items, remove, clearFinished, retry } = useUploadManager()
  const active = items.filter(isActive)
  const finished = items.filter((item) => !isActive(item))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle>{t("jobs.title")}</DialogTitle>
          <DialogDescription>{t("jobs.subtitle")}</DialogDescription>
        </DialogHeader>

        {items.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-3 px-5 py-12 text-center text-sm">
            <Icon name="bolt" className="size-7 opacity-60" />
            <p>{t("jobs.empty")}</p>
          </div>
        ) : (
          <div className="scrollbar-slim max-h-[60vh] overflow-y-auto px-2 pb-2">
            {active.length > 0 ? (
              <>
                <p className="text-muted-foreground/70 px-3 pt-2 pb-1 text-[11px] font-medium tracking-wider uppercase">
                  {t("jobs.active", { count: active.length })}
                </p>
                <ul className="divide-y">
                  <AnimatePresence initial={false}>
                    {active.map((item) => (
                      <JobRow key={item.id} item={item} onRemove={() => remove(item.id)} />
                    ))}
                  </AnimatePresence>
                </ul>
              </>
            ) : null}
            {finished.length > 0 ? (
              <>
                <p className="text-muted-foreground/70 px-3 pt-3 pb-1 text-[11px] font-medium tracking-wider uppercase">
                  {t("jobs.finished")}
                </p>
                <ul className="divide-y">
                  <AnimatePresence initial={false}>
                    {finished.map((item) => (
                      <JobRow
                        key={item.id}
                        item={item}
                        onRemove={() => remove(item.id)}
                        onRetry={() => retry(item.id)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </>
            ) : null}
          </div>
        )}

        {finished.length > 0 ? (
          <DialogFooter className="border-t px-5 py-3">
            <Button variant="ghost" size="sm" onClick={clearFinished}>
              {t("jobs.clearFinished")}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export default JobsDialog
