import { useCallback, useSyncExternalStore } from "react"

const listeners = new Map<string, Set<() => void>>()
const cache = new Map<string, number>()

const read = (key: string, fallback: number): number => {
  if (cache.has(key)) return cache.get(key)!
  if (typeof window === "undefined") return fallback
  const raw = window.localStorage.getItem(key)
  const parsed = raw != null ? Number(raw) : fallback
  const value = Number.isFinite(parsed) ? parsed : fallback
  cache.set(key, value)
  return value
}

/**
 * A number setting persisted to localStorage and shared live across components
 * (via useSyncExternalStore) without going through Redux. Survives refreshes.
 */
export const usePersistentNumber = (
  key: string,
  fallback: number,
): [number, (value: number) => void] => {
  const subscribe = useCallback(
    (callback: () => void) => {
      const set = listeners.get(key) ?? new Set()
      set.add(callback)
      listeners.set(key, set)
      return () => set.delete(callback)
    },
    [key],
  )

  const value = useSyncExternalStore(
    subscribe,
    () => read(key, fallback),
    () => fallback,
  )

  const setValue = useCallback(
    (next: number) => {
      cache.set(key, next)
      if (typeof window !== "undefined") window.localStorage.setItem(key, String(next))
      listeners.get(key)?.forEach((callback) => callback())
    },
    [key],
  )

  return [value, setValue]
}
