"use client"

import { type KeyboardEvent, useEffect, useRef, useState } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import { Input } from "@workspace/ui/components/input"
import { ROWS, a1Range, clamp } from "@pages/Sheets/sheetModel"
import type { SheetController } from "@pages/Sheets/useSheet"

/** The Name Box (A1 reference) plus the fx formula input, bound to the focused cell. */
const FormulaBar = ({ sheet }: { sheet: SheetController }) => {
  const focus = sheet.sel.focus
  const raw = sheet.rawAt(focus.r, focus.c)
  const [value, setValue] = useState(raw)
  const editing = useRef(false)

  useEffect(() => {
    if (!editing.current) setValue(raw)
  }, [raw, focus.r, focus.c])

  const commit = (move: boolean) => {
    sheet.setRaw(focus.r, focus.c, value.trim())
    editing.current = false
    if (move) sheet.selectOnly({ r: clamp(focus.r + 1, 0, ROWS - 1), c: focus.c })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      commit(true)
    } else if (event.key === "Escape") {
      editing.current = false
      setValue(raw)
      event.currentTarget.blur()
    }
  }

  return (
    <div className="bg-card flex items-stretch border-b text-sm">
      <div className="flex w-[120px] shrink-0 items-center justify-between gap-1 border-r px-2.5 py-1">
        <span className="truncate font-medium tabular-nums">{a1Range(sheet.selBox)}</span>
        <IconChevronDown className="text-muted-foreground size-3.5 shrink-0" />
      </div>
      <div className="text-muted-foreground flex w-9 shrink-0 items-center justify-center border-r font-serif italic">
        fx
      </div>
      <Input
        value={value}
        onChange={(event) => {
          editing.current = true
          setValue(event.target.value)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => editing.current && commit(false)}
        aria-label="Formula"
        className="h-8 flex-1 rounded-none border-none px-2.5 font-mono text-[0.8rem] shadow-none focus-visible:ring-0"
      />
    </div>
  )
}

export default FormulaBar
