"use client"

import { type Variants, motion } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import { RELEASES } from "@lib/changelog"
import {
  AndroidLogo,
  AppleLogo,
  GithubLogo,
  Globe,
  LinuxLogo,
  WindowsLogo,
} from "@phosphor-icons/react"

const REPO_URL = "https://github.com/MarquesCoding/PolarHQ"
const DOWNLOAD_URL = `${REPO_URL}/releases/latest`
const VERSION = RELEASES[0]?.version ?? "0.5.0-alpha"

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 0.61, 0.36, 1] } },
}

const Hero = () => (
  <section className="relative isolate overflow-hidden px-6 pt-36 pb-28 text-center sm:pt-40 sm:pb-36">
    {/* Layered violet backdrop: dotted texture + glows, all fading into the page (no hard edges). */}
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(75%_60%_at_50%_-6%,rgba(124,92,252,0.45),transparent_72%)]" />
      <div className="absolute inset-0 [background-image:radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(80%_70%_at_50%_28%,black,transparent_75%)]" />
      <div className="bg-primary/30 absolute -top-24 -left-24 size-[560px] rounded-full blur-[170px]" />
      <div className="absolute -top-10 -right-28 size-[500px] rounded-full bg-indigo-500/20 blur-[160px]" />
      <div className="bg-fuchsia-500/10 absolute top-40 left-1/3 size-[420px] rounded-full blur-[160px]" />
      <div className="to-background absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent" />
    </div>

    {/* Waving bear sticker wedged into the bottom-left corner, tilted — peeking in from the edge. */}
    <motion.img
      src="/stickers/bear-wave.png"
      alt=""
      width={340}
      height={340}
      className="pointer-events-none absolute -bottom-10 -left-10 z-10 w-44 rotate-[14deg] drop-shadow-[0_24px_48px_rgba(124,92,252,0.45)] sm:-bottom-12 sm:-left-12 sm:w-72 lg:w-80"
      initial={{ opacity: 0, y: 60, rotate: 26 }}
      animate={{ opacity: 1, y: 0, rotate: 14 }}
      transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
    />

    {/* A second, different bear peeking in from the right edge (wide screens only). */}
    <motion.img
      src="/stickers/bear-read.png"
      alt=""
      width={260}
      height={260}
      className="pointer-events-none absolute top-[34%] -right-12 z-10 hidden w-44 -rotate-[12deg] drop-shadow-[0_24px_48px_rgba(124,92,252,0.4)] lg:block lg:w-52"
      initial={{ opacity: 0, x: 60, rotate: -24 }}
      animate={{ opacity: 1, x: 0, rotate: -12 }}
      transition={{ duration: 0.9, delay: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
    />

    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-4xl flex-col items-center"
    >
      <motion.div
        variants={item}
        className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold backdrop-blur"
      >
        Open source · self-hosted · end-to-end encrypted
      </motion.div>

      <motion.h1
        variants={item}
        className="font-display text-foreground mt-6 text-5xl leading-[1.04] font-bold tracking-tight sm:text-7xl"
      >
        Your digital life,
        <br />
        under your <span className="text-primary">control</span>.
      </motion.h1>

      <motion.p
        variants={item}
        className="text-foreground/75 mx-auto mt-6 max-w-xl text-lg sm:text-xl"
      >
        A friendly home for your photos, files and documents — built around ownership, not lock-in.
      </motion.p>

      <motion.div variants={item} className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
        <Button
          render={<a href={DOWNLOAD_URL} target="_blank" rel="noreferrer" />}
          size="lg"
          className="gap-2 rounded-xl px-6 text-base font-semibold"
        >
          <AppleLogo className="size-4" weight="fill" />
          Download for desktop
        </Button>
        <Button
          variant="outline"
          render={<a href={REPO_URL} target="_blank" rel="noreferrer" />}
          size="lg"
          className="gap-2 rounded-xl px-6 text-base font-semibold"
        >
          <GithubLogo className="size-4" weight="fill" />
          Star on GitHub
        </Button>
      </motion.div>

      <motion.div variants={item} className="text-foreground/50 mt-6 flex items-center gap-3 text-sm">
        <span>Alpha v{VERSION}</span>
        <span aria-hidden className="bg-foreground/25 h-3 w-px" />
        <span>macOS · Windows · Linux</span>
      </motion.div>

      <motion.div variants={item} className="mt-7 flex items-center gap-6">
        <a
          href={DOWNLOAD_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Download for macOS"
          className="text-foreground/45 hover:text-foreground transition-colors"
        >
          <AppleLogo className="size-[18px]" />
        </a>
        <a
          href={DOWNLOAD_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Download for Windows"
          className="text-foreground/45 hover:text-foreground transition-colors"
        >
          <WindowsLogo className="size-[18px]" />
        </a>
        <a
          href={DOWNLOAD_URL}
          target="_blank"
          rel="noreferrer"
          aria-label="Download for Linux"
          className="text-foreground/45 hover:text-foreground transition-colors"
        >
          <LinuxLogo className="size-[18px]" />
        </a>
        <AndroidLogo className="text-foreground/25 size-[18px]" />
        <Globe className="text-foreground/45 size-[18px]" />
      </motion.div>
    </motion.div>
  </section>
)

export default Hero
