import { useEffect, useRef } from "react"
import type { ArmedConfirm } from "@lib/useArmedConfirm"

interface SelectionHotkeysOptions {
  active: boolean
  onClear: () => void
  confirm: ArmedConfirm
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
export const useSelectionHotkeys = ({ active, onClear, confirm }: SelectionHotkeysOptions): void => {
  const confirmRef = useRef(confirm)
  confirmRef.current = confirm

  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      if (event.key === "Escape") {
        if (confirmRef.current.armed) confirmRef.current.disarm()
        else onClear()
        return
      }
      if (event.shiftKey && (event.key === "D" || event.key === "d")) {
        event.preventDefault()
        confirmRef.current.trigger()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [active, onClear])
}
