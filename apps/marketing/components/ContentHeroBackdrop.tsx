"use client"

import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"

const PATHS = ["/blog", "/changelog", "/roadmap", "/terms", "/privacy"]

/**
 * Persistent hero video for the content pages. Mounted once in the root layout so it survives
 * client-side navigation between those pages (the video keeps playing); only the page text and
 * content beneath it re-render and fade.
 */
const ContentHeroBackdrop = () => {
  const pathname = usePathname()
  const show = PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="content-hero-backdrop"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_-10%,rgba(124,92,252,0.34),transparent_70%)]" />
          <div className="bg-primary/20 absolute -top-24 -left-32 size-[520px] rounded-full blur-[150px]" />
          <div className="absolute top-6 -right-32 size-[460px] rounded-full bg-indigo-500/15 blur-[150px]" />
          <div className="to-background absolute inset-0 bg-gradient-to-b from-transparent" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default ContentHeroBackdrop
