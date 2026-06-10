"use client"

import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setViewMode } from "@store/uiSlice"
import { IconLayoutGrid, IconList } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "react-i18next"

/** Grid ↔ table view switch for the app toolbar. */
const ViewToggle = () => {
  const { t } = useTranslation("common")
  const dispatch = useAppDispatch()
  const view = useAppSelector((state) => state.ui.viewMode)

  return (
    <div className="bg-muted/60 flex items-center gap-0.5 rounded-lg p-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("viewToggle.gridView")}
        aria-pressed={view === "grid"}
        onClick={() => dispatch(setViewMode("grid"))}
        className={cn("rounded-md", view === "grid" && "bg-background shadow-sm")}
      >
        <IconLayoutGrid className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t("viewToggle.tableView")}
        aria-pressed={view === "table"}
        onClick={() => dispatch(setViewMode("table"))}
        className={cn("rounded-md", view === "table" && "bg-background shadow-sm")}
      >
        <IconList className="size-4" />
      </Button>
    </div>
  )
}

export default ViewToggle
