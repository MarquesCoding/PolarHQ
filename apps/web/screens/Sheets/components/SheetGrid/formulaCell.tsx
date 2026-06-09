"use client"

import { type RefObject, type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import {
  type CustomCell,
  type CustomRenderer,
  GridCellKind,
  drawTextCell,
} from "@glideapps/glide-data-grid"
import { cn } from "@workspace/ui/lib/utils"
import { FUNCTION_DOCS } from "@pages/Sheets/functionDocs"
import type { SheetController } from "@pages/Sheets/useSheet"

export interface FormulaCellData {
  readonly kind: "formula-cell"
  readonly raw: string
  readonly display: string
}

export type FormulaCell = CustomCell<FormulaCellData>

type Movement = readonly [-1 | 0 | 1, -1 | 0 | 1]

interface EditorProps {
  value: FormulaCell
  initialValue?: string
  onChange: (newValue: FormulaCell) => void
  onFinishedEditing: (newValue?: FormulaCell, movement?: Movement) => void
}

const FormulaEditor = ({
  sheetRef,
  value: cell,
  initialValue,
  onChange,
  onFinishedEditing,
}: EditorProps & { sheetRef: RefObject<SheetController> }) => {
  const [text, setText] = useState(initialValue ?? cell.data.raw)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const isFormula = text.startsWith("=")

  useEffect(() => {
    sheetRef.current?.setEditingFormula(isFormula ? text : null)
  }, [text, isFormula, sheetRef])
  useEffect(() => () => sheetRef.current?.setEditingFormula(null), [sheetRef])

  useEffect(() => {
    const el = inputRef.current
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [])

  const token = useMemo(() => {
    if (!isFormula) return null
    const match = text.match(/([A-Za-z][A-Za-z0-9.]*)$/)
    return match ? match[1] : null
  }, [text, isFormula])

  const suggestions = useMemo(() => {
    if (!token) return []
    const upper = token.toUpperCase()
    return (sheetRef.current?.functionNames ?? [])
      .filter((name) => name.startsWith(upper) && name !== upper)
      .slice(0, 8)
  }, [token, sheetRef])

  useEffect(() => setActive(0), [token])

  const change = (next: string) => {
    setText(next)
    onChange({ ...cell, data: { ...cell.data, raw: next } })
  }

  const accept = (name: string) => {
    const base = token ? text.slice(0, text.length - token.length) : text
    change(`${base}${name}(`)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const finish = (movement?: Movement) => {
    sheetRef.current?.setEditingFormula(null)
    onFinishedEditing({ ...cell, data: { ...cell.data, raw: text.trim() } }, movement)
  }

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault()
        event.stopPropagation()
        setActive((i) => (i + 1) % suggestions.length)
        return
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        event.stopPropagation()
        setActive((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (event.key === "Tab") {
        event.preventDefault()
        event.stopPropagation()
        const pick = suggestions[active]
        if (pick) accept(pick)
        return
      }
    }
    if (event.key === "Enter") {
      event.preventDefault()
      event.stopPropagation()
      finish([0, 1])
    } else if (event.key === "Tab") {
      event.preventDefault()
      event.stopPropagation()
      finish([1, 0])
    } else if (event.key === "Escape") {
      event.preventDefault()
      event.stopPropagation()
      sheetRef.current?.setEditingFormula(null)
      onFinishedEditing(undefined)
    }
  }

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        value={text}
        onChange={(event) => change(event.target.value)}
        onKeyDown={onKeyDown}
        spellCheck={false}
        className="w-full bg-transparent px-2 font-mono text-[13px] outline-none"
        style={{ minHeight: 24, lineHeight: "24px" }}
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
            Tab to accept · ↑↓ to navigate
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** A text cell whose editor is a formula input with function autocomplete + live
 *  reference highlighting. Text rendering is delegated to glide's drawTextCell. */
export const createFormulaRenderer = (
  sheetRef: RefObject<SheetController>,
): CustomRenderer<FormulaCell> => ({
  kind: GridCellKind.Custom,
  isMatch: (cell): cell is FormulaCell =>
    (cell.data as Partial<FormulaCellData>).kind === "formula-cell",
  draw: (args, cell) => {
    drawTextCell(args, cell.data.display, cell.contentAlign)
    return true
  },
  provideEditor: () => ({
    disablePadding: true,
    editor: (props: EditorProps) => <FormulaEditor sheetRef={sheetRef} {...props} />,
  }),
})
