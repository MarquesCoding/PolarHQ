"use client"

import { useEffect, useState } from "react"
import { Icon } from "@lib/icons"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { AnimatePresence, motion } from "motion/react"

const STORAGE_KEY = "polarhq.onboarded.v1"

interface Slide {
  icon: string
  accent: string
  title: string
  body: string
  /** A tiny abstract preview of the flow, drawn from div primitives (no assets needed). */
  preview: React.ReactNode
}

const SLIDES: Slide[] = [
  {
    icon: "shield-lock",
    accent: "from-emerald-500/20 to-emerald-500/5",
    title: "Private by default.",
    body: "Every photo, document and file is end-to-end encrypted. Only you hold the keys — the server only ever sees ciphertext.",
    preview: (
      <div className="flex h-full items-center justify-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-background/70 ring-border flex size-12 items-center justify-center rounded-xl ring-1"
          >
            <Icon name="key" className="text-emerald-500 size-5" />
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: "photo",
    accent: "from-primary/20 to-primary/5",
    title: "Just drop them in.",
    body: "Drag photos anywhere to upload. Live Photos pair up and bursts collapse into a single, expandable stack automatically.",
    preview: (
      <div className="grid h-full grid-cols-3 gap-1.5 p-1">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "bg-background/70 ring-border rounded-md ring-1",
              i === 0 && "ring-primary/60 ring-2",
            )}
          />
        ))}
      </div>
    ),
  },
  {
    icon: "albums",
    accent: "from-violet-500/20 to-violet-500/5",
    title: "Albums & shareable links.",
    body: "Group photos into albums for trips and people, then share a private link — no account required to view.",
    preview: (
      <div className="flex h-full items-center justify-center gap-2">
        <div className="bg-background/70 ring-border size-14 rounded-xl ring-1" />
        <div className="flex flex-col gap-1.5">
          <div className="bg-background/70 ring-border h-2.5 w-16 rounded-full ring-1" />
          <div className="bg-background/40 h-2 w-10 rounded-full" />
          <div className="bg-primary/15 text-primary mt-1 flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium">
            <Icon name="open-external" className="size-2.5" />
            Share
          </div>
        </div>
      </div>
    ),
  },
]

/** First-run suite intro: a dismissible bottom-right card that walks through key flows once. */
const OnboardingCard = () => {
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      /* private mode — just don't show it */
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  const slide = SLIDES[index]!
  const last = index === SLIDES.length - 1

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50"
        >
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className="bg-background/70 absolute inset-0 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="panel absolute right-4 bottom-4 w-[340px] overflow-hidden rounded-2xl shadow-2xl select-none"
          >
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismiss}
            className="text-muted-foreground hover:bg-muted hover:text-foreground absolute top-3 right-3 z-10 flex size-7 items-center justify-center rounded-full transition"
          >
            <Icon name="xmark" className="size-4" />
          </button>

          <div className="px-5 pt-5">
            <div
              className={cn(
                "ring-border h-32 overflow-hidden rounded-xl bg-gradient-to-b ring-1 ring-inset",
                slide.accent,
              )}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  className="h-full p-3"
                >
                  {slide.preview}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="px-5 pt-4 pb-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <p className="text-foreground text-sm font-semibold">{slide.title}</p>
                <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">{slide.body}</p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="border-border/60 flex items-center justify-between border-t px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                {SLIDES.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === index ? "bg-primary w-4" : "bg-muted-foreground/30 w-1.5",
                    )}
                  />
                ))}
              </div>
              <span className="text-muted-foreground text-xs tabular-nums">
                {index + 1}/{SLIDES.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {index > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setIndex((i) => i - 1)}>
                  Back
                </Button>
              ) : null}
              {last ? (
                <Button size="sm" onClick={dismiss}>
                  Get started
                </Button>
              ) : (
                <Button size="sm" onClick={() => setIndex((i) => i + 1)}>
                  Next
                </Button>
              )}
            </div>
          </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export default OnboardingCard
