import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"
type Resolved = "light" | "dark"

/** Accent colour themes — the default violet plus alternates (see globals.css `[data-accent]`). */
export type Accent = "violet" | "blue" | "emerald" | "rose" | "amber"
export const ACCENTS: Accent[] = ["violet", "blue", "emerald", "rose", "amber"]

interface ThemeState {
  theme: Theme
  resolvedTheme: Resolved
  setTheme: (theme: Theme) => void
  accent: Accent
  setAccent: (accent: Accent) => void
}

const STORAGE_KEY = "theme"
const ACCENT_KEY = "accent"
const ThemeContext = createContext<ThemeState | null>(null)

const systemTheme = (): Resolved =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

const apply = (resolved: Resolved): void => {
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
}

const applyAccent = (accent: Accent): void => {
  const root = document.documentElement
  if (accent === "violet") root.removeAttribute("data-accent")
  else root.setAttribute("data-accent", accent)
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

  const [accent, setAccentState] = useState<Accent>(
    () => (localStorage.getItem(ACCENT_KEY) as Accent | null) ?? "violet",
  )
  useEffect(() => {
    applyAccent(accent)
  }, [accent])
  const setAccent = useCallback((next: Accent) => {
    localStorage.setItem(ACCENT_KEY, next)
    setAccentState(next)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeState => {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider")
  return ctx
}
