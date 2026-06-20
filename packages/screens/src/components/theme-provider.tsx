import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"
type Resolved = "light" | "dark"

interface ThemeState {
  theme: Theme
  resolvedTheme: Resolved
  setTheme: (theme: Theme) => void
}

const STORAGE_KEY = "theme"
const ThemeContext = createContext<ThemeState | null>(null)

const systemTheme = (): Resolved =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

const apply = (resolved: Resolved): void => {
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
}

/**
 * Theme provider (light / dark / system) for the Vite SPA. Persists the choice to localStorage and
 * toggles the `dark` class on <html>; an inline script in index.html applies the stored theme
 * before first paint to avoid a flash.
 */
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system",
  )
  const [resolvedTheme, setResolved] = useState<Resolved>(() =>
    theme === "system" ? systemTheme() : theme,
  )

  useEffect(() => {
    const resolved = theme === "system" ? systemTheme() : theme
    setResolved(resolved)
    apply(resolved)
  }, [theme])

  useEffect(() => {
    if (theme !== "system") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      const resolved = systemTheme()
      setResolved(resolved)
      apply(resolved)
    }
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeState => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
