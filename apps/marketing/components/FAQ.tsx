"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import { Icon } from "@lib/icons"

const FAQS = [
  {
    q: "Is Orbit really end-to-end encrypted?",
    a: "Yes. Your content is encrypted on your device with keys derived from your password. The server only ever stores ciphertext — it can't read your photos, files or documents.",
  },
  {
    q: "Can I self-host it?",
    a: "Absolutely — that's the point. Orbit is AGPL and ships as Docker images. One compose file gets you the full suite on your own server, with no external dependencies.",
  },
  {
    q: "What apps are included?",
    a: "Photos, Drive, and collaborative Docs, Sheets & Presentations today, with Passwords and an Authenticator on the way. Everything shares one encrypted account.",
  },
  {
    q: "Is there a mobile app?",
    a: "Yes — a native iOS app with the full Photos experience, end-to-end decryption on-device, and live sync with the web. You point it at your own server.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "It's yours. Export everything at any time, or just keep self-hosting — there's no lock-in and no proprietary formats.",
  },
  {
    q: "Do you offer SSO for teams?",
    a: "The Enterprise plan adds OIDC, SSO and SCIM provisioning, plus per-user storage up to 1 TB and dedicated support.",
  },
]

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-border border-b">
      <Button
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className="flex h-auto w-full items-center justify-between gap-4 rounded-none px-0 py-5 text-left hover:bg-transparent"
      >
        <span className="text-foreground text-lg font-semibold">{q}</span>
        <Icon
          name="plus"
          className={`text-muted-foreground size-5 shrink-0 transition-transform ${open ? "rotate-45" : ""}`}
        />
      </Button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="text-muted-foreground max-w-2xl pb-6 leading-relaxed">{a}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

const FAQ = () => (
  <section id="faq" className="mx-auto max-w-3xl px-6 py-28">
    <h2 className="text-foreground text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
      Questions, answered
    </h2>
    <div className="mt-12">
      {FAQS.map((f) => (
        <FAQItem key={f.q} q={f.q} a={f.a} />
      ))}
    </div>
  </section>
)

export default FAQ
