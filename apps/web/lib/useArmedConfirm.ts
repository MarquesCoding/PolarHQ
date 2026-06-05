import { useCallback, useEffect, useRef, useState } from "react"

export interface ArmedConfirm {
  armed: boolean
  trigger: () => void
  disarm: () => void
}

/**
 * Two-step confirm shared between a button and a hotkey: the first `trigger()`
 * arms (auto-disarms after `timeoutMs`), the second within the window confirms.
 */
export const useArmedConfirm = (onConfirm: () => void, timeoutMs = 4000): ArmedConfirm => {
  const [armed, setArmed] = useState(false)
  const armedRef = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const set = useCallback((value: boolean) => {
    armedRef.current = value
    setArmed(value)
  }, [])

  const trigger = useCallback(() => {
    clearTimeout(timer.current)
    if (armedRef.current) {
      set(false)
      onConfirm()
    } else {
      set(true)
      timer.current = setTimeout(() => set(false), timeoutMs)
    }
  }, [onConfirm, timeoutMs, set])

  const disarm = useCallback(() => {
    clearTimeout(timer.current)
    set(false)
  }, [set])

  useEffect(() => () => clearTimeout(timer.current), [])

  return { armed, trigger, disarm }
}
