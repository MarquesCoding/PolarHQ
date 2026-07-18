import { useAppDispatch, useAppSelector } from "@workspace/screens/store/hooks"
import { setViewMode } from "@workspace/screens/store/uiSlice"
import { Columns, GridFour, ListBullets } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"

interface ViewToggleProps {
  /** Show the Miller-column option (only meaningful in folder-hierarchical browsers). */
  columns?: boolean
}

/** Grid ↔ table (↔ columns) view switch with a sliding highlight, matching the workspace mode pill. */
const ViewToggle = ({ columns = false }: ViewToggleProps) => {
  const { t } = useTranslation("common")
  const dispatch = useAppDispatch()
  const view = useAppSelector((state) => state.ui.viewMode)

  const items = [
    { id: "grid" as const, icon: GridFour, label: t("viewToggle.gridView") },
    { id: "table" as const, icon: ListBullets, label: t("viewToggle.tableView") },
    ...(columns
      ? [{ id: "columns" as const, icon: Columns, label: t("viewToggle.columnsView") }]
      : []),
  ]

  return (
    <div className="bg-muted/60 flex items-center rounded-full p-0.5">
      {items.map(({ id, icon: Glyph, label }) => (
        <Button
          key={id}
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={view === id}
          onClick={() => dispatch(setViewMode(id))}
          className={cn(
            "relative rounded-full",
            view === id ? "text-foreground hover:bg-transparent" : "text-muted-foreground",
          )}
        >
          {view === id ? (
            <motion.span
              layoutId="view-toggle-pill"
              className="bg-background absolute inset-0 rounded-full shadow-sm"
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            />
          ) : null}
          <Glyph className="relative size-4" />
        </Button>
      ))}
    </div>
  )
}

export default ViewToggle
