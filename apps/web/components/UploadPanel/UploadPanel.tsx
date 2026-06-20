import { useState } from "react"
import { useUploadManager } from "@workspace/screens/uploadManager"
import { CaretDown } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { AnimatePresence, motion } from "motion/react"
import { useTranslation } from "react-i18next"
import { JobRow } from "@components/UploadPanel/jobRow"

const UploadPanel = () => {
  const { t } = useTranslation("common")
  const { items, remove, clearFinished, retry } = useUploadManager()
  const [collapsed, setCollapsed] = useState(false)

  const uploading = items.filter(
    (item) => item.kind === "upload" && item.status === "uploading",
  ).length
  const compressing = items.filter((item) => item.status === "processing").length
  const downloading = items.filter(
    (item) => item.kind === "download" && item.status === "uploading",
  ).length
  const archiving = items.filter(
    (item) => item.kind === "task" && item.status === "uploading",
  ).length
  const title =
    uploading > 0
      ? t("uploadPanel.uploadingItems", { count: uploading })
      : compressing > 0
        ? t("uploadPanel.processingItems", { count: compressing })
        : downloading > 0
          ? t("uploadPanel.downloadingItems", { count: downloading })
          : archiving > 0
            ? t("uploadPanel.archivingItems", { count: archiving })
            : t("uploadPanel.activity")

  return (
    <AnimatePresence>
      {items.length > 0 ? (
        <motion.div
          key="upload-panel"
          className="panel text-card-foreground fixed right-4 bottom-4 z-40 w-80 overflow-hidden rounded-2xl shadow-xl"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
            <span className="text-sm font-medium">{title}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={clearFinished}>
                {t("uploadPanel.clear")}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={collapsed ? t("uploadPanel.expand") : t("uploadPanel.collapse")}
                onClick={() => setCollapsed((value) => !value)}
              >
                <CaretDown
                  className={cn("size-4 transition-transform", collapsed && "rotate-180")}
                />
              </Button>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {!collapsed ? (
              <motion.ul
                key="list"
                className="max-h-72 divide-y overflow-y-auto"
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                exit={{ height: 0 }}
              >
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <JobRow
                      key={item.id}
                      item={item}
                      onRemove={() => remove(item.id)}
                      onRetry={() => retry(item.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default UploadPanel
