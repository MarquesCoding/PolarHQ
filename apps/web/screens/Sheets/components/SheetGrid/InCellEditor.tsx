"use client"

import { type KeyboardEvent as ReactKeyboardEvent, type RefObject, useEffect, useMemo, useState } from "react"
import { cn } from "@workspace/ui/lib/utils"
import { FUNCTION_DOCS } from "@pages/Sheets/functionDocs"
import type { SheetController } from "@pages/Sheets/useSheet"

export interface EditState {
  col: number
  row: number
  text: string
}

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

interface InCellEditorProps {
  sheet: SheetController
  edit: EditState
  bounds: Bounds
  inputRef: RefObject<HTMLInputElement | null>
  onChange: (text: string) => void
  onCommit: (movement: readonly [number, number]) => void
  onCancel: () => void
}

/** A self-managed in-cell formula editor: function autocomplete + live reference
 *  highlighting, and it stays open while clicking cells (handled by the grid) so
 *  references can be inserted. */
const InCellEditor = ({
  sheet,
  edit,
  bounds,
  inputRef,
  onChange,
  onCommit,
  onCancel,
}: InCellEditorProps) => {
  const [active, setActive] = useState(0)
  const text = edit.text
  const isFormula = text.startsWith("=")

  useEffect(() => {
    sheet.setEditingFormula(isFormula ? text : null)
  }, [text, isFormula, sheet])

  const token = useMemo(() => {
    if (!isFormula) return null
    const match = text.match(/([A-Za-z][A-Za-z0-9.]*)$/)
    return match ? match[1] : null
  }, [text, isFormula])

  const suggestions = useMemo(() => {
    if (!token) return []
    const upper = token.toUpperCase()
    return sheet.functionNames.filter((name) => name.startsWith(upper) && name !== upper).slice(0, 8)
  }, [token, sheet.functionNames])

  useEffect(() => setActive(0), [token])

  const accept = (name: string) => {
    const base = token ? text.slice(0, text.length - token.length) : text
    onChange(`${base}${name}(`)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
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
      if (event.key === "Tab" || (event.key === "Enter" && active > 0)) {
        event.preventDefault()
        const pick = suggestions[active]
        if (pick) accept(pick)
        return
      }
    }
    if (event.key === "Enter") {
      event.preventDefault()
      onCommit([0, event.shiftKey ? -1 : 1])
    } else if (event.key === "Tab") {
      event.preventDefault()
      onCommit([event.shiftKey ? -1 : 1, 0])
    } else if (event.key === "Escape") {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <div
      className="border-primary bg-background fixed z-50 box-border border-2 shadow-lg"
      style={{ left: bounds.x, top: bounds.y, minWidth: bounds.width, height: bounds.height }}
    >
      <input
        ref={inputRef}
        autoFocus
        value={text}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        className="size-full bg-transparent px-1.5 font-mono text-[13px] outline-none"
      />
      {suggestions.length > 0 ? (
        <div className="bg-popover absolute top-full left-0 z-50 mt-1 w-72 overflow-hidden rounded-md border shadow-lg">
          {suggestions.map((name, i) => (
            <button
              key={name}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault()
                accept(name)
              }}
              className={cn(
                "block w-full px-2.5 py-1.5 text-left",
                i === active ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <span className="font-mono text-xs">{name}</span>
              {i === active && FUNCTION_DOCS[name] ? (
                <span className="text-muted-foreground mt-0.5 block text-[11px] leading-snug">
                  {FUNCTION_DOCS[name]}
                </span>
              ) : null}
            </button>
          ))}
          <div className="text-muted-foreground border-t px-2.5 py-1 text-[11px]">
            Tab to accept · click a cell to insert a reference
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default InCellEditor
