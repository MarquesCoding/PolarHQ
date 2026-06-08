"use client"

import type { ReactNode } from "react"
import { motion } from "motion/react"

const Template = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
  >
    {children}
  </motion.div>
)

export default Template
