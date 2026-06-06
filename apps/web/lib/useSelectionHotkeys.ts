import { useEffect, useRef } from "react"
import type { ArmedConfirm } from "@lib/useArmedConfirm"

interface SelectionHotkeysOptions {
  active: boolean
  onClear: () => void
  confirm: ArmedConfirm
  onFavourite?: () => void
  onShare?: () => void
  onAlbum?: () => void
  onTag?: () => void
  onDownload?: () => void
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
 * Selection keyboard shortcuts: Shift+D arms the delete (second Shift+D confirms);
 * Esc first disarms a pending delete, and otherwise clears the selection.
 */
export const useSelectionHotkeys = (options: SelectionHotkeysOptions): void => {
  const { active, onClear } = options
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      const current = optionsRef.current
      if (event.key === "Escape") {
        if (current.confirm.armed) current.confirm.disarm()
        else onClear()
        return
      }
      if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return
      const action: Record<string, (() => void) | undefined> = {
        d: () => current.confirm.trigger(),
        f: current.onFavourite,
        s: current.onShare,
        a: current.onAlbum,
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
  }, [active, onClear])
}
