"use client"

import { motion } from "motion/react"
import { Check, Cube } from "@phosphor-icons/react"

const POINTS = [
  "One click from any photo",
  "Runs on your own GPU, fully offline",
  "Saved & synced, end-to-end encrypted",
]

const SplatSection = () => (
  <section className="relative overflow-hidden py-24 sm:py-32">
    <div className="mx-auto max-w-6xl px-6">
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease: [0.22, 0.61, 0.36, 1] }}
        className="mx-auto max-w-2xl text-center"
      >
        <div className="border-primary/25 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold">
          <Cube className="size-3.5" weight="fill" />
          New · 3D
        </div>
        <h2 className="font-display text-foreground mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
          Turn a single photo into 3D
        </h2>
        <p className="text-foreground/65 mx-auto mt-5 max-w-xl text-lg text-pretty">
          Generate a real 3D Gaussian splat from any photo — powered by Apple's SHARP model running on
          your own hardware, fully offline. Orbit it, and it saves encrypted alongside the original.
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {POINTS.map((point) => (
            <li key={point} className="text-foreground/75 flex items-center gap-2 text-[15px]">
              <span className="bg-primary/15 text-primary flex size-5 shrink-0 items-center justify-center rounded-full">
                <Check className="size-3" weight="bold" />
              </span>
              {point}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative mx-auto mt-14 max-w-4xl"
      >
        <div className="from-primary/25 absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-b to-transparent blur-2xl" />
        <div className="border-foreground/10 overflow-hidden rounded-2xl border bg-black shadow-[0_40px_100px_-30px_rgba(0,0,0,0.55)]">
          <video
            src="/demos/splat.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="block w-full"
          />
        </div>
      </motion.div>
    </div>
  </section>
)

export default SplatSection
