"use client"

import { motion } from "motion/react"
import { Icon } from "@lib/icons"

const FEATURES = [
  {
    icon: "shield-lock",
    title: "End-to-end encrypted",
    body: "Your files, photos and notes are encrypted on your device. The server only ever stores ciphertext.",
  },
  {
    icon: "buildings",
    title: "Truly self-hosted",
    body: "One Docker command. Run the whole suite on your own hardware — no third parties, no lock-in.",
  },
  {
    icon: "images-3",
    title: "Photos that feel native",
    body: "Timeline, albums, on-device search, Live Photos and a Years/Months/All library, fully private.",
  },
  {
    icon: "folder",
    title: "Drive + documents",
    body: "Files, folders, and collaborative docs, sheets and presentations — all living in one Drive.",
  },
  {
    icon: "bolt",
    title: "Live sync everywhere",
    body: "Changes on the web appear on your phone in real time, and vice-versa, over an encrypted channel.",
  },
  {
    icon: "users",
    title: "Built for teams too",
    body: "Workgroups, per-user limits, roles and an admin console — scale from one person to an org.",
  },
]

const Features = () => (
  <section id="features" className="mx-auto max-w-6xl px-6 py-28">
    <div className="max-w-2xl">
      <h2 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl">
        Your whole digital life, private by default
      </h2>
      <p className="text-muted-foreground mt-4 text-lg">
        Everything you'd reach for a big tech account for — without handing them your data.
      </p>
    </div>

    <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {FEATURES.map((feature, i) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
          className="border-border bg-card rounded-3xl border p-7"
        >
          <div className="bg-primary/10 flex size-12 items-center justify-center rounded-2xl">
            <Icon name={feature.icon} className="text-primary size-6" />
          </div>
          <h3 className="text-foreground mt-5 text-lg font-bold">{feature.title}</h3>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{feature.body}</p>
        </motion.div>
      ))}
    </div>
  </section>
)

export default Features
