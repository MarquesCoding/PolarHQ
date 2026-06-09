"use client"

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { IconChevronDown } from "@tabler/icons-react"
import { toast } from "sonner"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { a1Range, clamp } from "@pages/Sheets/sheetModel"
import type { SheetController } from "@pages/Sheets/useSheet"

/** The Name Box (A1 reference) plus the fx formula input, bound to the focused cell. */
const FormulaBar = ({ sheet }: { sheet: SheetController }) => {
  const focus = sheet.sel.focus
  const raw = sheet.rawAt(focus.r, focus.c)
  const [value, setValue] = useState(raw)
  const [active, setActive] = useState(0)
  const editing = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing.current) setValue(raw)
  }, [raw, focus.r, focus.c])

  const token = useMemo(() => {
    if (!value.startsWith("=")) return null
    const match = value.match(/([A-Za-z][A-Za-z0-9.]*)$/)
    return match ? match[1] : null
  }, [value])

  const suggestions = useMemo(() => {
    if (!token) return []
    const upper = token.toUpperCase()
    return sheet.functionNames.filter((name) => name.startsWith(upper) && name !== upper).slice(0, 8)
  }, [token, sheet.functionNames])

  useEffect(() => setActive(0), [token])

  const accept = (name: string) => {
    const base = token ? value.slice(0, value.length - token.length) : value
    editing.current = true
    setValue(`${base}${name}(`)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const commit = (move: boolean) => {
    const trimmed = value.trim()
    const error = sheet.validateCell(focus.r, focus.c, trimmed)
    if (error) {
      toast.error(error)
      return
    }
    sheet.setRaw(focus.r, focus.c, trimmed)
    editing.current = false
    if (move) sheet.selectOnly({ r: clamp(focus.r + 1, 0, sheet.rows - 1), c: focus.c })
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        setActive((i) => (i + 1) % suggestions.length)
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setActive((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === "Tab") {
        event.preventDefault()
        const pick = suggestions[active]
        if (pick) accept(pick)
        return
      }
    }
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
      <div className="relative flex-1">
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => {
            editing.current = true
            setValue(event.target.value)
          }}
          onKeyDown={onKeyDown}
          onBlur={() => editing.current && commit(false)}
          aria-label="Formula"
          className="h-8 w-full rounded-none border-none px-2.5 font-mono text-[0.8rem] shadow-none focus-visible:ring-0"
        />
        {suggestions.length > 0 ? (
          <div className="bg-popover absolute top-full left-1 z-50 mt-0.5 w-64 overflow-hidden rounded-md border shadow-md">
            {suggestions.map((name, i) => (
              <button
                key={name}
                type="button"
                className={cn(
                  "flex w-full px-2.5 py-1 text-left font-mono text-xs",
                  i === active ? "bg-accent" : "hover:bg-accent/60",
                )}
                onMouseDown={(event) => {
                  event.preventDefault()
                  accept(name)
                }}
              >
                {name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default FormulaBar
