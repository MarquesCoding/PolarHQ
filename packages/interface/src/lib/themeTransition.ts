"use client"

const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/**
 * Apply a theme change with a circular clip-path reveal centred on `origin` (the toggle), using
 * the View Transitions API. When `reverse` is false the new theme grows out from the origin; when
 * true the old theme shrinks back into it (so turning dark mode off mirrors turning it on). Falls
 * back to an instant switch when the API is unavailable or the user prefers reduced motion.
 */
export const applyThemeWithReveal = (
  apply: () => void,
  origin?: { x: number; y: number },
  reverse = false,
): void => {
  if (typeof document.startViewTransition !== "function" || prefersReducedMotion()) {
    apply()
    return
  }

  const root = document.documentElement
  const x = origin?.x ?? window.innerWidth / 2
  const y = origin?.y ?? window.innerHeight / 2
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )
  const small = `circle(0px at ${x}px ${y}px)`
  const large = `circle(${endRadius}px at ${x}px ${y}px)`

  if (reverse) root.setAttribute("data-vt-reverse", "")
  const transition = document.startViewTransition(() => apply())
  void transition.ready.then(() => {
    root.animate(
      { clipPath: reverse ? [large, small] : [small, large] },
      {
        duration: 480,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
        pseudoElement: reverse ? "::view-transition-old(root)" : "::view-transition-new(root)",
      },
    )
  })
  void transition.finished.finally(() => root.removeAttribute("data-vt-reverse"))
}
