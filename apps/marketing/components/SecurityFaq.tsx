"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Plus } from "@phosphor-icons/react"
import { cn } from "@workspace/ui/lib/utils"

const FAQS: { q: string; a: string }[] = [
  {
    q: "Can the server (or PolarHQ) read my files?",
    a: "No. Every photo, file and document is encrypted on your device before upload, with a key derived from your password. The server only ever stores ciphertext and never has your key, so it can't read your library or even the file names, including if the database or storage is breached.",
  },
  {
    q: "What happens if I forget my password?",
    a: "Your password protects your keys, so it can't be reset for you without breaking end-to-end encryption. When you sign up you get a one-time recovery code; keep it somewhere safe. With your password or that recovery code you can regain access. Without either, encrypted data cannot be recovered by anyone.",
  },
  {
    q: "What encryption do you actually use?",
    a: "libsodium: XSalsa20-Poly1305 (secretbox) for most data, and secretstream for large files, with your master key derived from your password via a memory-hard KDF. Every item gets its own random content key that's sealed to your master key, the same key-hierarchy model established E2E apps use.",
  },
  {
    q: "If everything's encrypted, how do thumbnails and search work?",
    a: "On your device. Thumbnails are generated and encrypted in your browser, and photo search runs locally over encrypted embeddings, so the server never sees a plaintext image, filename or search query.",
  },
  {
    q: "Can I still share files with other people?",
    a: "Yes. Sharing hands over only the single content key for that one item, through a link you control, so a recipient can decrypt exactly what you shared (and you can revoke it) without exposing anything else in your library.",
  },
  {
    q: "Is it open source and auditable?",
    a: "Yes. PolarHQ is fully open source, so the cryptography and every line that touches your data can be inspected by anyone. Self-host it and you own the entire stack end to end.",
  },
]

const SecurityFaq = () => {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div className="divide-foreground/10 border-foreground/10 bg-foreground/[0.02] divide-y overflow-hidden rounded-2xl border">
      {FAQS.map((faq, index) => {
        const isOpen = open === index
        return (
          <div key={faq.q}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-foreground font-medium">{faq.q}</span>
              <Plus
                className={cn(
                  "text-foreground/50 size-5 shrink-0 transition-transform duration-200",
                  isOpen && "rotate-45",
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="text-foreground/65 px-5 pb-5 text-[15px] leading-relaxed text-pretty">
                    {faq.a}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

export default SecurityFaq
