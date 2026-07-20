import type { ReactNode } from "react"
import { Link as RouterLink, useLocation, useNavigate } from "react-router"
import { type Platform, PlatformProvider } from "@workspace/screens/platform"

const Link: Platform["Link"] = ({ href, ...rest }) => <RouterLink to={href} {...rest} />

/**
 * Supplies the React Router implementations of the screens' {@link Platform} contract (router +
 * Link), so shared screen components stay router-agnostic. The same contract is reused by the Tauri
 * desktop shell (also Vite + React Router).
 */
export const PlatformAdapter = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const value: Platform = {
    navigation: {
      push: (href) => void navigate(href),
      replace: (href) => void navigate(href, { replace: true }),
      back: () => void navigate(-1),
      forward: () => void navigate(1),
    },
    pathname,
    Link,
  }
  return <PlatformProvider value={value}>{children}</PlatformProvider>
}

export default PlatformAdapter
