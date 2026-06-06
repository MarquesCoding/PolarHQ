"use client"

import { type KeyboardEvent, Fragment, useEffect, useRef, useState } from "react"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import type * as Y from "yjs"

const COLS = 26
const ROWS = 100
const colLabel = (c: number): string => String.fromCharCode(65 + c)
const cellKey = (r: number, c: number): string => `${r}:${c}`
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n))

interface Pos {
  r: number
  c: number
}

/** A collaborative spreadsheet grid backed by a Yjs map (cell key "row:col" → value). */
const SheetGrid = ({ ydoc }: { ydoc: Y.Doc }) => {
  const cells = ydoc.getMap<string>("cells")
  const [, force] = useState(0)
  const [sel, setSel] = useState<Pos>({ r: 0, c: 0 })
  const [edit, setEdit] = useState<{ pos: Pos; value: string } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = () => force((value) => value + 1)
    cells.observe(observer)
    return () => cells.unobserve(observer)
  }, [cells])

  const valueAt = (r: number, c: number): string => cells.get(cellKey(r, c)) ?? ""
  const setValue = (r: number, c: number, value: string) => {
    if (value) cells.set(cellKey(r, c), value)
    else cells.delete(cellKey(r, c))
  }

  const focusGrid = () => gridRef.current?.focus()
  const startEdit = (pos: Pos, initial?: string) =>
    setEdit({ pos, value: initial ?? valueAt(pos.r, pos.c) })
  const commitEdit = (next?: Pos) => {
    if (edit) setValue(edit.pos.r, edit.pos.c, edit.value.trim())
    setEdit(null)
    if (next) setSel(next)
    focusGrid()
  }
  const move = (dr: number, dc: number) =>
    setSel((s) => ({ r: clamp(s.r + dr, 0, ROWS - 1), c: clamp(s.c + dc, 0, COLS - 1) }))

  const onGridKey = (event: KeyboardEvent) => {
    if (edit) return
    const { key } = event
    if (key === "ArrowUp") move(-1, 0)
    else if (key === "ArrowDown") move(1, 0)
    else if (key === "ArrowLeft") move(0, -1)
    else if (key === "ArrowRight" || key === "Tab") move(0, 1)
    else if (key === "Enter") startEdit(sel)
    else if (key === "Backspace" || key === "Delete") setValue(sel.r, sel.c, "")
    else if (key.length === 1 && !event.metaKey && !event.ctrlKey) {
      startEdit(sel, key)
      return
    } else return
    event.preventDefault()
  }

  const onInputKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      commitEdit({ r: clamp(sel.r + 1, 0, ROWS - 1), c: sel.c })
    } else if (event.key === "Tab") {
      event.preventDefault()
      commitEdit({ r: sel.r, c: clamp(sel.c + 1, 0, COLS - 1) })
    } else if (event.key === "Escape") {
      event.preventDefault()
      setEdit(null)
      focusGrid()
    }
  }

  return (
    <div
      ref={gridRef}
      tabIndex={0}
      onKeyDown={onGridKey}
      className="scrollbar-slim min-h-0 flex-1 overflow-auto outline-none"
    >
      <div
        className="inline-grid text-sm"
        style={{ gridTemplateColumns: `3rem repeat(${COLS}, 7rem)` }}
      >
        <div className="bg-muted border-border/60 sticky top-0 left-0 z-20 h-7 border-r border-b" />
        {Array.from({ length: COLS }).map((_, c) => (
          <div
            key={c}
            className="bg-muted text-muted-foreground border-border/60 sticky top-0 z-10 flex h-7 items-center justify-center border-r border-b font-medium"
          >
            {colLabel(c)}
          </div>
        ))}

        {Array.from({ length: ROWS }).map((_, r) => (
          <Fragment key={r}>
            <div className="bg-muted text-muted-foreground border-border/60 sticky left-0 z-10 flex h-7 items-center justify-center border-r border-b text-xs">
              {r + 1}
            </div>
            {Array.from({ length: COLS }).map((_, c) => {
              const selected = sel.r === r && sel.c === c
              const editing = edit?.pos.r === r && edit.pos.c === c
              return (
                <div
                  key={c}
                  onClick={() => {
                    setSel({ r, c })
                    focusGrid()
                  }}
                  onDoubleClick={() => startEdit({ r, c })}
                  className={cn(
                    "border-border/40 h-7 cursor-cell truncate border-r border-b px-1.5 leading-7",
                    selected && !editing && "ring-primary bg-primary/5 ring-2 ring-inset",
                  )}
                >
                  {editing ? (
                    <Input
                      autoFocus
                      value={edit.value}
                      onChange={(event) => setEdit({ pos: { r, c }, value: event.target.value })}
                      onKeyDown={onInputKey}
                      onBlur={() => commitEdit()}
                      className="h-7 rounded-none border-none px-0 shadow-none focus-visible:ring-0"
                    />
                  ) : (
                    valueAt(r, c)
                  )}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

export default SheetGrid
