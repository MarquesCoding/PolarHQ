"use client"

import type { ComponentType } from "react"
import { motion } from "motion/react"
import {
  IconFileContentFillDuo18,
  IconFolderFillDuo18,
  IconImageFillDuo18,
  IconServerFillDuo18,
} from "nucleo-ui-fill-duo-18"

interface Item {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}

const ITEMS: Item[] = [
  {
    icon: IconImageFillDuo18,
    title: "Photos",
    description:
      "An intelligent gallery that finds faces, places and things on device. Your memories stay encrypted and entirely yours.",
  },
  {
    icon: IconFolderFillDuo18,
    title: "Drive",
    description:
      "Every file in one encrypted home. Sync across devices, share with a link and open Office documents in a click.",
  },
  {
    icon: IconFileContentFillDuo18,
    title: "Docs and Sheets",
    description:
      "Collaborative documents and spreadsheets with real time collaboration and end to end encryption on every keystroke.",
  },
  {
    icon: IconServerFillDuo18,
    title: "Self-hosted",
    description:
      "Deploy the whole suite with a single command and keep every byte on hardware you control.",
  },
]

const Showcase = () => (
  <section className="mx-auto max-w-4xl px-6 py-32">
    <div className="mx-auto max-w-2xl text-center">
      <div className="border-border/70 bg-background/70 text-foreground/80 inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-medium backdrop-blur">
        Everything in one place
      </div>
      <h2 className="text-foreground mt-6 text-4xl font-medium tracking-tight sm:text-5xl">
        One private suite. Every app you need.
      </h2>
      <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg">
        The everyday tools you rely on, rebuilt to run on your own server and answer to no one but
        you.
      </p>
    </div>

    <div className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2">
      {ITEMS.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1], delay: (index % 2) * 0.08 }}
        >
          <item.icon className="text-primary size-7" />
          <h3 className="text-foreground mt-4 text-xl font-medium tracking-tight">{item.title}</h3>
          <p className="text-muted-foreground mt-2 text-base leading-relaxed">{item.description}</p>
        </motion.div>
      ))}
    </div>
  </section>
)

export default Showcase
