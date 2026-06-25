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
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden [mask-image:linear-gradient(to_bottom,black,black_45%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,black,black_45%,transparent)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(65%_75%_at_50%_-10%,rgba(124,92,252,0.38),transparent_72%)]" />
          <div className="absolute inset-0 [background-image:radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(70%_80%_at_50%_10%,black,transparent_75%)]" />
          <div className="bg-primary/25 absolute -top-24 -left-32 size-[560px] rounded-full blur-[160px]" />
          <div className="absolute -top-10 -right-32 size-[480px] rounded-full bg-indigo-500/18 blur-[160px]" />
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default ContentHeroBackdrop
