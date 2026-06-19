"use client"

import { type AnchorHTMLAttributes, type ComponentType, type ReactNode, createContext, useContext } from "react"

/** The subset of routing the screens use, injected per shell (Next router on web, a Vite/Tauri
 *  router on desktop) so screen components never import `next/*` directly. */
export interface Navigation {
  push: (href: string) => void
  replace: (href: string) => void
  back: () => void
}

export type LinkProps = { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">

export interface Platform {
  navigation: Navigation
  /** Current path; reactive — the shell adapter re-renders the provider on navigation. */
  pathname: string
  /** A client-side link component (Next `Link` on web; a router link on desktop). */
  Link: ComponentType<LinkProps>
}

const PlatformContext = createContext<Platform | null>(null)

export const PlatformProvider = ({ value, children }: { value: Platform; children: ReactNode }) => (
  <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
)

const usePlatform = (): Platform => {
  const ctx = useContext(PlatformContext)
  if (!ctx) throw new Error("usePlatform must be used within a PlatformProvider")
  return ctx
}

/** Drop-in for `useRouter()` (the methods the app uses: push / replace / back). */
export const useNavigation = (): Navigation => usePlatform().navigation

/** Drop-in for next/navigation's `usePathname()`. */
export const usePathname = (): string => usePlatform().pathname

/** Drop-in for next/link's `Link`. */
export const AppLink = (props: LinkProps) => {
  const { Link } = usePlatform()
  return <Link {...props} />
}
