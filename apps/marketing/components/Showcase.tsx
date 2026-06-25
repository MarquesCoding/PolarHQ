"use client"

import { motion } from "motion/react"

interface Item {
  sticker: string
  title: string
  description: string
}

const ITEMS: Item[] = [
  {
    sticker: "/stickers/bear-browse.png",
    title: "Photos",
    description:
      "An intelligent gallery that finds faces, places and things on device. Your memories stay encrypted and entirely yours.",
  },
  {
    sticker: "/stickers/bear-organise.png",
    title: "Drive",
    description:
      "Every file in one encrypted home. Sync across devices, share with a link and open Office documents in a click.",
  },
  {
    sticker: "/stickers/bear-read.png",
    title: "Docs & Sheets",
    description:
      "Collaborative documents and spreadsheets with real-time collaboration and end-to-end encryption on every keystroke.",
  },
  {
    sticker: "/stickers/bear-hide.png",
    title: "Self-hosted",
    description:
      "Deploy the whole suite with a single command and keep every byte on hardware you control.",
  },
]

const Showcase = () => (
  <section className="mx-auto max-w-5xl px-6 py-28 sm:py-36">
    <div className="mx-auto max-w-2xl text-center">
      <div className="border-primary/30 bg-primary/10 text-primary inline-flex items-center rounded-full border px-3.5 py-1.5 text-[13px] font-semibold">
        Everything in one place
      </div>
      <h2 className="font-display text-foreground mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
        One private suite.
        <br className="hidden sm:block" /> Every app you need.
      </h2>
      <p className="text-foreground/70 mx-auto mt-5 max-w-xl text-lg">
        The everyday tools you rely on, rebuilt to run on your own server and answer to no one but
        you.
      </p>
    </div>

    <div className="mt-16 grid gap-6 sm:grid-cols-2">
      {ITEMS.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1], delay: (index % 2) * 0.08 }}
          className="border-border/60 bg-card/40 group relative overflow-hidden rounded-3xl border p-7 backdrop-blur transition-colors hover:border-primary/40"
        >
          <div className="bg-primary/10 absolute -top-12 -right-12 size-44 rounded-full blur-3xl" />
          <motion.img
            src={item.sticker}
            alt=""
            width={96}
            height={96}
            className="relative size-20 drop-shadow-[0_12px_24px_rgba(124,92,252,0.35)]"
            whileHover={{ scale: 1.08, rotate: -4 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          />
          <h3 className="font-display text-foreground relative mt-5 text-2xl font-bold tracking-tight">
            {item.title}
          </h3>
          <p className="text-foreground/65 relative mt-2 text-base leading-relaxed">
            {item.description}
          </p>
        </motion.div>
      ))}
    </div>
  </section>
)

export default Showcase
