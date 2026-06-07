"use client"

import { motion } from "motion/react"
import { Icon } from "@lib/icons"

interface Service {
  name: string
  icon: string
  x: number
}

// x is the horizontal centre in the 1000-wide SVG space (also the chip's left %).
const SERVICES: Service[] = [
  { name: "Photos", icon: "images-3", x: 80 },
  { name: "Drive", icon: "folder", x: 290 },
  { name: "Docs", icon: "file-text", x: 500 },
  { name: "Passwords", icon: "key", x: 710 },
  { name: "Auth", icon: "shield-lock", x: 920 },
]

const ServicesFlow = () => (
  <section className="mx-auto max-w-5xl px-6 py-28 text-center">
    <h2 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl">
      Everything flows into one place
    </h2>
    <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
      Separate apps, one encrypted core. Your data stays together, on your server.
    </p>

    <div className="relative mx-auto mt-16 h-[260px] w-full max-w-3xl">
      <div className="absolute inset-x-0 top-0 h-12">
        {SERVICES.map((s) => (
          <motion.div
            key={s.name}
            className="absolute -translate-x-1/2"
            style={{ left: `${s.x / 10}%` }}
            initial={{ opacity: 0, y: -12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: s.x / 4000 }}
          >
            <div className="border-border bg-card flex size-12 items-center justify-center rounded-2xl border shadow-sm">
              <Icon name={s.icon} className="text-foreground size-6" />
            </div>
            <div className="text-muted-foreground mt-2 text-xs font-medium">{s.name}</div>
          </motion.div>
        ))}
      </div>

      <svg
        viewBox="0 0 1000 240"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-12 h-[150px] w-full"
        aria-hidden
      >
        {SERVICES.map((s) => (
          <motion.path
            key={s.name}
            d={`M ${s.x} 0 C ${s.x} 120, 500 120, 500 240`}
            fill="none"
            stroke="#288dff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray="6 10"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 0.5 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        ))}
      </svg>

      <div className="absolute bottom-0 left-1/2 -translate-x-1/2">
        <motion.div
          className="bg-primary relative flex size-20 items-center justify-center rounded-3xl shadow-xl"
          initial={{ scale: 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 200, damping: 16, delay: 0.4 }}
        >
          <motion.span
            className="bg-primary/30 absolute inset-0 rounded-3xl"
            animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <span className="size-7 rounded-full bg-white" />
        </motion.div>
        <div className="text-foreground mt-2 text-sm font-bold">Orbit</div>
      </div>
    </div>
  </section>
)

export default ServicesFlow
