"use client"

import { type ReactNode, useContext, useRef } from "react"
import { usePathname } from "next/navigation"
import { LayoutRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { AnimatePresence, motion } from "motion/react"

/**
 * Freezes the router context for the outgoing subtree so it keeps rendering the previous page's
 * content while it animates out, instead of snapping to the new route mid-exit.
 */
const FrozenRouter = ({ children }: { children: ReactNode }) => {
  const context = useContext(LayoutRouterContext)
  const frozen = useRef(context).current
  if (!frozen) return <>{children}</>
  return <LayoutRouterContext.Provider value={frozen}>{children}</LayoutRouterContext.Provider>
}

const PageTransition = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.26, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <FrozenRouter>{children}</FrozenRouter>
      </motion.div>
    </AnimatePresence>
  )
}

export default PageTransition
