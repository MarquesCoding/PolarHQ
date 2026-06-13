"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { IconPlus, IconX } from "@tabler/icons-react"
import { cn } from "@polarhq/ui/lib/utils"
import type { SheetController } from "@pages/Sheets/useSheet"

/** Bottom tab strip for switching, adding, renaming (double-click) and deleting sheets. */
const SheetTabs = ({ sheet }: { sheet: SheetController }) => {
  const { t } = useTranslation("sheets")
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div className="bg-card flex shrink-0 items-center gap-1 border-t px-2 py-1 text-sm">
      <button
        type="button"
        onClick={sheet.addSheet}
        aria-label={t("sheetTabs.addSheet")}
        className="hover:bg-accent text-muted-foreground hover:text-foreground flex size-7 shrink-0 items-center justify-center rounded-md"
      >
        <IconPlus className="size-4" />
      </button>
      <div className="scrollbar-slim flex items-center gap-0.5 overflow-x-auto">
        {sheet.sheets.map((s) => {
          const active = s.id === sheet.activeSheetId
          if (editing === s.id) {
            return (
              <input
                key={s.id}
                autoFocus
                defaultValue={s.name}
                onBlur={(event) => {
                  sheet.renameSheet(s.id, event.target.value)
                  setEditing(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    sheet.renameSheet(s.id, event.currentTarget.value)
                    setEditing(null)
                  } else if (event.key === "Escape") {
                    setEditing(null)
                  }
                }}
                className="border-border bg-background h-7 w-28 rounded-md border px-2 text-sm outline-none"
              />
            )
          }
          return (
            <div
              key={s.id}
              onClick={() => sheet.setActiveSheet(s.id)}
              onDoubleClick={() => setEditing(s.id)}
              className={cn(
                "group flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 whitespace-nowrap",
                active
                  ? "bg-accent text-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50",
              )}
            >
              <span>{s.name}</span>
              {sheet.sheets.length > 1 ? (
                <button
                  type="button"
                  aria-label={t("sheetTabs.deleteSheet", { name: s.name })}
                  onClick={(event) => {
                    event.stopPropagation()
                    sheet.deleteSheet(s.id)
                  }}
                  className="hover:text-foreground text-muted-foreground/60 opacity-0 transition group-hover:opacity-100"
                >
                  <IconX className="size-3" />
                </button>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SheetTabs
