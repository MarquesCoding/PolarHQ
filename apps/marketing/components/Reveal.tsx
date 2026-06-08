"use client"

import type { ReactNode } from "react"
import { motion } from "motion/react"

const Reveal = ({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "0px 0px -5% 0px" }}
    transition={{ duration: 0.5, delay, ease: [0.22, 0.61, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
)

export default Reveal
