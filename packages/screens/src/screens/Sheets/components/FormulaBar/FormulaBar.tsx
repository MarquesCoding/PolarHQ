import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { CaretDown } from "@phosphor-icons/react"
import { toast } from "sonner"
import { Input } from "@workspace/ui/components/input"
import { Kbd } from "@workspace/ui/components/kbd"
import { cn } from "@workspace/ui/lib/utils"
import { a1Range, clamp, parseFormulaRefs } from "@pages/Sheets/sheetModel"
import { FUNCTION_DOCS } from "@pages/Sheets/functionDocs"
import type { SheetController } from "@pages/Sheets/useSheet"

/** The Name Box (A1 reference) plus the fx formula input, bound to the focused cell. */
const FormulaBar = ({ sheet }: { sheet: SheetController }) => {
  const { t } = useTranslation("sheets")
  const focus = sheet.sel.focus
  const raw = sheet.rawAt(focus.r, focus.c)
  const [value, setValue] = useState(raw)
  const [active, setActive] = useState(0)
  const editing = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isFormula = value.startsWith("=")

  useEffect(() => {
    if (!editing.current) setValue(raw)
  }, [raw, focus.r, focus.c])

  const update = (next: string) => {
    editing.current = true
    setValue(next)
    sheet.setEditingFormula(next.startsWith("=") ? next : null)
  }

  const stopEditing = () => {
    editing.current = false
    sheet.setEditingFormula(null)
  }

  const token = useMemo(() => {
    if (!isFormula) return null
    const match = value.match(/([A-Za-z][A-Za-z0-9.]*)$/)
    return match ? match[1] : null
  }, [value, isFormula])

  const suggestions = useMemo(() => {
    if (!token) return []
    const upper = token.toUpperCase()
    return sheet.functionNames.filter((name) => name.startsWith(upper) && name !== upper).slice(0, 8)
  }, [token, sheet.functionNames])

  useEffect(() => setActive(0), [token])

  const segments = useMemo(() => {
    const refs = parseFormulaRefs(value)
    if (refs.length === 0) return [{ text: value, color: null as string | null }]
    const out: Array<{ text: string; color: string | null }> = []
    let pos = 0
    for (const ref of refs) {
      if (ref.start > pos) out.push({ text: value.slice(pos, ref.start), color: null })
      out.push({ text: value.slice(ref.start, ref.end), color: ref.color })
      pos = ref.end
    }
    if (pos < value.length) out.push({ text: value.slice(pos), color: null })
    return out
  }, [value])

  const accept = (name: string) => {
    const base = token ? value.slice(0, value.length - token.length) : value
    update(`${base}${name}(`)
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
    stopEditing()
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
      stopEditing()
      setValue(raw)
      event.currentTarget.blur()
    }
  }

  return (
    <div className="bg-card flex items-stretch border-b text-sm">
      <div className="flex w-[120px] shrink-0 items-center justify-between gap-1 border-r px-2.5 py-1">
        <span className="truncate font-medium tabular-nums">{a1Range(sheet.selBox)}</span>
        <CaretDown className="text-muted-foreground size-3.5 shrink-0" />
      </div>
      <div className="text-muted-foreground flex w-9 shrink-0 items-center justify-center border-r font-serif italic">
        fx
      </div>
      <div className="relative flex-1">
        {isFormula ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-2.5 font-mono text-[0.8rem] whitespace-pre"
          >
            {segments.map((segment, i) => (
              <span key={i} style={segment.color ? { color: segment.color } : undefined}>
                {segment.text}
              </span>
            ))}
          </div>
        ) : null}
        <Input
          ref={inputRef}
          value={value}
          onChange={(event) => update(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (editing.current) commit(false)
            stopEditing()
          }}
          aria-label={t("formulaBar.formulaLabel")}
          style={isFormula ? { color: "transparent", caretColor: "var(--foreground)" } : undefined}
          className="relative h-8 w-full rounded-none border-none bg-transparent px-2.5 font-mono text-[0.8rem] shadow-none focus-visible:ring-0"
        />
        {suggestions.length > 0 ? (
          <div className="bg-popover absolute top-full left-1 z-50 mt-0.5 w-72 overflow-hidden rounded-md border shadow-md">
            {suggestions.map((name, i) => (
              <button
                key={name}
                type="button"
                className={cn(
                  "block w-full px-2.5 py-1.5 text-left",
                  i === active ? "bg-accent" : "hover:bg-accent/60",
                )}
                onMouseDown={(event) => {
                  event.preventDefault()
                  accept(name)
                }}
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
              <Kbd>Tab</Kbd> {t("formulaBar.suggestionHint")}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default FormulaBar
