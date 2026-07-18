"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowUp } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"

const BackToTop = () => {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.9 }}
          transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          className="fixed right-5 bottom-5 z-50 sm:right-8 sm:bottom-8"
        >
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="bg-background/80 size-11 rounded-full shadow-lg backdrop-blur"
          >
            <ArrowUp className="size-5" weight="bold" />
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default BackToTop
