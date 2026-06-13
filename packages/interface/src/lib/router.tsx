import type { AnchorHTMLAttributes, MouseEvent } from "react"
import { useLocation, useRouter as useTanstackRouter } from "@tanstack/react-router"

/**
 * Routing seam over `@tanstack/react-router`. The app navigates through this small,
 * stable surface (`Link` with `href`, `useRouter` push/replace/back/refresh,
 * `usePathname`) so screens stay router-agnostic. `to` is widened to a plain string
 * here on purpose — the app builds hrefs dynamically rather than from the typed tree.
 */
interface AppRouter {
  push: (href: string) => void
  replace: (href: string) => void
  back: () => void
  refresh: () => void
}

export const useRouter = (): AppRouter => {
  const router = useTanstackRouter()
  const navigate = router.navigate as (opts: { to: string; replace?: boolean }) => Promise<void>
  return {
    push: (href) => {
      void navigate({ to: href })
    },
    replace: (href) => {
      void navigate({ to: href, replace: true })
    },
    back: () => {
      router.history.back()
    },
    refresh: () => {
      void router.invalidate()
    },
  }
}

export const usePathname = (): string => useLocation({ select: (location) => location.pathname })

interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
}

export const Link = ({ href, onClick, ...rest }: LinkProps) => {
  const { push } = useRouter()
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (event.defaultPrevented) return
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    push(href)
  }
  return <a href={href} onClick={handleClick} {...rest} />
}
