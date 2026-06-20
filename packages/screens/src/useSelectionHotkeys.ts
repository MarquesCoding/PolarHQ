import { useEffect, useRef } from "react"
import type { ArmedConfirm } from "./useArmedConfirm"

interface SelectionHotkeysOptions {
  active: boolean
  onClear: () => void
  confirm: ArmedConfirm
  onFavourite?: () => void
  onShare?: () => void
  onAlbum?: () => void
  onTag?: () => void
  onDownload?: () => void
  onSelectAll?: () => void
}

const isTypingTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null
  return Boolean(
    element &&
      (element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.isContentEditable),
  )
}

/**
 * Selection keyboard shortcuts: Shift+A selects all (even with nothing selected);
 * Shift+D arms the delete (second Shift+D confirms); Shift+L adds to an album; Esc
 * first disarms a pending delete, and otherwise clears the selection.
 */
export const useSelectionHotkeys = (options: SelectionHotkeysOptions): void => {
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const current = optionsRef.current
      const mod = event.metaKey || event.ctrlKey || event.altKey

      if (event.shiftKey && !mod && event.key.toLowerCase() === "a") {
        if (current.onSelectAll) {
          event.preventDefault()
          current.onSelectAll()
        }
        return
      }

      if (!current.active) return
      if (event.key === "Escape") {
        if (current.confirm.armed) current.confirm.disarm()
        else current.onClear()
        return
      }
      if (!event.shiftKey || mod) return
      const action: Record<string, (() => void) | undefined> = {
        d: () => current.confirm.trigger(),
        f: current.onFavourite,
        s: current.onShare,
        l: current.onAlbum,
        t: current.onTag,
        w: current.onDownload,
      }
      const run = action[event.key.toLowerCase()]
      if (run) {
        event.preventDefault()
        run()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
}
