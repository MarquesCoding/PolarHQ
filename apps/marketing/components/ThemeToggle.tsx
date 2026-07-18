"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Moon, Sun } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"

const ThemeToggle = () => {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    try {
      localStorage.setItem("theme", next ? "dark" : "light")
    } catch {
      /* storage unavailable — theme just won't persist */
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className="relative overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? "moon" : "sun"}
          initial={{ y: 12, opacity: 0, rotate: -30 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -12, opacity: 0, rotate: 30 }}
          transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
          className="flex"
        >
          {dark ? <Moon className="size-5" weight="fill" /> : <Sun className="size-5" weight="fill" />}
        </motion.span>
      </AnimatePresence>
    </Button>
  )
}

export default ThemeToggle
