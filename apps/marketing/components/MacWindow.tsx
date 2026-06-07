"use client"

import { motion } from "motion/react"

/// A mock of the Orbit Photos app, shown inside the "MacBook screen" — dark UI, square photo
/// grid (gradient placeholders standing in for real photos), and the floating glass pill.
const GRADIENTS = [
  "linear-gradient(135deg,#f6d365,#fda085)",
  "linear-gradient(135deg,#84fab0,#8fd3f4)",
  "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  "linear-gradient(135deg,#5ee7df,#b490ca)",
  "linear-gradient(135deg,#ff9a9e,#fecfef)",
  "linear-gradient(135deg,#0ba360,#3cba92)",
  "linear-gradient(135deg,#2980b9,#6dd5fa)",
  "linear-gradient(135deg,#f093fb,#f5576c)",
  "linear-gradient(135deg,#4facfe,#00f2fe)",
  "linear-gradient(135deg,#ffecd2,#fcb69f)",
  "linear-gradient(135deg,#3a1c71,#d76d77)",
  "linear-gradient(135deg,#1d2b64,#f8cdda)",
  "linear-gradient(135deg,#11998e,#38ef7d)",
  "linear-gradient(135deg,#fc5c7d,#6a82fb)",
  "linear-gradient(135deg,#c79081,#dfa579)",
  "linear-gradient(135deg,#667eea,#764ba2)",
  "linear-gradient(135deg,#f7971e,#ffd200)",
  "linear-gradient(135deg,#7f7fd5,#86a8e7)",
  "linear-gradient(135deg,#e0c3fc,#8ec5fc)",
  "linear-gradient(135deg,#ff758c,#ff7eb3)",
  "linear-gradient(135deg,#42e695,#3bb2b8)",
  "linear-gradient(135deg,#c2e59c,#64b3f4)",
  "linear-gradient(135deg,#cc208e,#6713d2)",
  "linear-gradient(135deg,#f8b500,#fceabb)",
]

interface MacWindowProps {
  /// When true, the grid tiles stagger into place (used by the scroll "pop-in").
  populated?: boolean
}

const MacWindow = ({ populated = true }: MacWindowProps) => (
  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[18px] border border-white/10 bg-[#0e0e11] shadow-2xl ring-1 ring-white/10">
    <div className="flex items-center gap-1.5 px-4 py-3">
      <span className="size-2.5 rounded-full bg-[#ff5f57]" />
      <span className="size-2.5 rounded-full bg-[#febc2e]" />
      <span className="size-2.5 rounded-full bg-[#28c840]" />
      <span className="ml-3 text-[11px] font-medium text-white/40">Photos — Orbit</span>
    </div>

    <div className="px-5 pb-2">
      <div className="text-lg font-bold text-white">Library</div>
      <div className="text-[11px] text-white/40">Today</div>
    </div>

    <motion.div
      className="grid grid-cols-8 gap-1 px-2"
      initial={false}
      animate={populated ? "show" : "hide"}
      variants={{ show: { transition: { staggerChildren: 0.018 } } }}
    >
      {GRADIENTS.map((g, i) => (
        <motion.div
          key={i}
          className="aspect-square rounded-[4px]"
          style={{ backgroundImage: g }}
          variants={{
            hide: { opacity: 0, scale: 0.6 },
            show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 320, damping: 24 } },
          }}
        />
      ))}
    </motion.div>

    <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
      <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-md">
        {["Years", "Months", "All"].map((t) => (
          <span
            key={t}
            className={
              t === "All"
                ? "rounded-full bg-[#288dff] px-3 py-1 text-[11px] font-semibold text-white"
                : "px-3 py-1 text-[11px] font-medium text-white/70"
            }
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  </div>
)

export default MacWindow
