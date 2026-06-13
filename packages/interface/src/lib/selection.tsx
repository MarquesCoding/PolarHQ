"use client"

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"

export interface SelectionApi {
  selected: ReadonlySet<string>
  count: number
  isSelected: (id: string) => boolean
  toggle: (id: string, ordered: string[]) => void
  toggleMany: (ids: string[]) => void
  rangeTo: (id: string, ordered: string[]) => void
  selectOnly: (id: string) => void
  selectAll: (ids: string[]) => void
  clear: () => void
}

const SelectionContext = createContext<SelectionApi | null>(null)

export const SelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const anchorRef = useRef<string | null>(null)

  const toggle = useCallback((id: string) => {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    anchorRef.current = id
  }, [])

  const rangeTo = useCallback((id: string, ordered: string[]) => {
    const anchor = anchorRef.current ?? id
    const start = ordered.indexOf(anchor)
    const end = ordered.indexOf(id)
    if (start === -1 || end === -1) {
      setSelected((previous) => new Set(previous).add(id))
      return
    }
    const [low, high] = start < end ? [start, end] : [end, start]
    setSelected((previous) => {
      const next = new Set(previous)
      for (let i = low; i <= high; i += 1) next.add(ordered[i]!)
      return next
    })
  }, [])

  const toggleMany = useCallback((ids: string[]) => {
    setSelected((previous) => {
      const next = new Set(previous)
      const allSelected = ids.length > 0 && ids.every((id) => next.has(id))
      for (const id of ids) {
        if (allSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }, [])

  const selectOnly = useCallback((id: string) => {
    setSelected(new Set([id]))
    anchorRef.current = id
  }, [])

  const selectAll = useCallback((ids: string[]) => setSelected(new Set(ids)), [])

  const clear = useCallback(() => {
    setSelected(new Set())
    anchorRef.current = null
  }, [])

  const api = useMemo<SelectionApi>(
    () => ({
      selected,
      count: selected.size,
      isSelected: (id) => selected.has(id),
      toggle: (id) => toggle(id),
      toggleMany,
      rangeTo,
      selectOnly,
      selectAll,
      clear,
    }),
    [selected, toggle, toggleMany, rangeTo, selectOnly, selectAll, clear],
  )

  return <SelectionContext.Provider value={api}>{children}</SelectionContext.Provider>
}

export const useSelection = (): SelectionApi => {
  const context = useContext(SelectionContext)
  if (!context) throw new Error("useSelection must be used within a SelectionProvider")
  return context
}
