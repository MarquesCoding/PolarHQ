import { type ComponentType, type ReactNode, Suspense, lazy } from "react"

interface DynamicOptions {
  loading?: () => ReactNode
}

/**
 * Client-only lazy-loading seam: `React.lazy` + a `<Suspense>` boundary. Mirrors the
 * old `next/dynamic({ ssr: false })` call sites — there is no SSR to opt out of.
 */
export const dynamic = <P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  options?: DynamicOptions,
): ComponentType<P> => {
  const Lazy = lazy(loader)
  const Dynamic = (props: P) => (
    <Suspense fallback={options?.loading?.() ?? null}>
      <Lazy {...props} />
    </Suspense>
  )
  return Dynamic
}
