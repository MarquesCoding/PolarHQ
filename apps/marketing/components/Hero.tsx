"use client"

import { useRef } from "react"
import { type Variants, motion, useScroll, useTransform } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import {
  AndroidLogo,
  AppleLogo,
  GithubLogo,
  Globe,
  LinuxLogo,
  WindowsLogo,
} from "@phosphor-icons/react"

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.16, delayChildren: 1.1 } },
}

const group: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: [0.22, 0.61, 0.36, 1] } },
}

const Hero = () => {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] })
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.86])
  const borderRadius = useTransform(scrollYProgress, [0, 1], [28, 48])
  return (
    <section ref={ref} className="relative isolate flex h-svh flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 p-4 sm:p-5">
        <motion.div
          style={{ scale, borderRadius }}
          className="relative h-full w-full overflow-hidden mt-4"
        >
          <motion.video
            src="/player.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.8, ease: [0.22, 0.61, 0.36, 1] }}
            className="h-full w-full object-cover"
          />
          <div className="from-background/45 via-background/15 to-background/80 absolute inset-0 bg-gradient-to-b" />
          <div
            className="absolute inset-0"
            style={{
              background: "radial-gradient(56% 48% at 50% 44%, rgba(0,0,0,0.34), transparent 72%)",
            }}
          />
        </motion.div>
      </div>

      <a
        href="https://store.steampowered.com/app/1608230/Planet_of_Lana/"
        target="_blank"
        rel="noreferrer"
        className="text-foreground/35 hover:text-foreground/60 absolute right-6 bottom-6 z-10 text-[11px] tracking-wide transition-colors sm:right-8 sm:bottom-8"
      >
        Artwork from Planet of Lana (2023)
      </a>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center px-6 text-center [text-shadow:0_1px_12px_rgba(0,0,0,0.35)]"
      >
        <motion.div
          variants={item}
          className="border-border/70 bg-background/70 text-foreground/80 inline-flex items-center rounded-full border px-3 py-1 text-[13px] font-medium backdrop-blur"
        >
          Open source · self-hosted · end-to-end encrypted
        </motion.div>

        <motion.h1
          variants={item}
          className="text-foreground mt-7 text-5xl font-medium leading-16 tracking-tight sm:text-7xl"
        >
          Your digital life,
          <br />
          under your{" "}
          <span className="text-blue-400 italic" style={{ fontFamily: "var(--font-serif)" }}>
            control
          </span>
          .
        </motion.h1>

        <motion.p variants={item} className="text-foreground/90 mx-auto mt-6 max-w-2xl text-lg">
          A modern home for your photos, files, and documents, built around ownership instead of
          lock-in.
        </motion.p>

        <motion.div
          variants={group}
          className="mt-9 flex flex-col items-center gap-5 [text-shadow:none]"
        >
          <motion.div
            variants={group}
            className="flex flex-col items-center gap-3 sm:flex-row"
          >
            <motion.div variants={item}>
              <Button
                size="lg"
                className="gap-2 rounded-xl border border-white/15 bg-white/10 px-6 text-white shadow-sm backdrop-blur hover:bg-white/20"
              >
                <AppleLogo className="size-4" />
                Download for Mac
              </Button>
            </motion.div>
            <motion.div variants={item}>
              <Button
                size="lg"
                className="gap-2 rounded-xl border border-white/15 bg-white/10 px-6 text-white shadow-sm backdrop-blur hover:bg-white/20"
              >
                <GithubLogo className="size-4" />
                Star on GitHub
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            variants={item}
            className="text-foreground/55 flex items-center gap-3 text-sm"
          >
            <span>Alpha v0.1.0</span>
            <span aria-hidden className="bg-foreground/25 h-3 w-px" />
            <span>macOS 12+</span>
          </motion.div>

          <motion.div
            variants={item}
            className="text-foreground/55 flex items-center gap-6"
          >
            <AppleLogo className="size-[18px]" />
            <WindowsLogo className="size-[18px]" />
            <LinuxLogo className="size-[18px]" />
            <AndroidLogo className="size-[18px]" />
            <Globe className="size-[18px]" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Hero
