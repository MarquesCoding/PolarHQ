"use client"

import type { ReactNode } from "react"
import NextLink from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { type Platform, PlatformProvider } from "@workspace/screens/platform"

const Link: Platform["Link"] = ({ href, ...rest }) => <NextLink href={href} {...rest} />

/**
 * Supplies the Next.js implementations of the screens' {@link Platform} contract (router + Link), so
 * shared screen components stay free of `next/*`. The Tauri/Vite desktop shell will provide its own.
 */
export const PlatformAdapter = ({ children }: { children: ReactNode }) => {
  const router = useRouter()
  const pathname = usePathname()
  const value: Platform = {
    navigation: {
      push: (href) => router.push(href),
      replace: (href) => router.replace(href),
      back: () => router.back(),
    },
    pathname,
    Link,
  }
  return <PlatformProvider value={value}>{children}</PlatformProvider>
}

export default PlatformAdapter
