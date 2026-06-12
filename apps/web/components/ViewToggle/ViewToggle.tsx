"use client"

import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setViewMode } from "@store/uiSlice"
import { IconColumns2, IconLayoutGrid, IconList } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { useTranslation } from "react-i18next"

interface ViewToggleProps {
  /** Show the Miller-column option (only meaningful in folder-hierarchical browsers). */
  columns?: boolean
}

/** Grid ↔ table (↔ columns) view switch for the app toolbar. */
const ViewToggle = ({ columns = false }: ViewToggleProps) => {
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
      {columns ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("viewToggle.columnsView")}
          aria-pressed={view === "columns"}
          onClick={() => dispatch(setViewMode("columns"))}
          className={cn("rounded-md", view === "columns" && "bg-background shadow-sm")}
        >
          <IconColumns2 className="size-4" />
        </Button>
      ) : null}
    </div>
  )
}

export default ViewToggle
