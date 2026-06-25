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
  <section className="relative isolate flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-20 text-center">
    {/* Soft violet aurora backdrop. */}
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_-8%,rgba(124,92,252,0.40),transparent_70%)]" />
      <div className="bg-primary/25 absolute top-24 -left-32 size-[520px] rounded-full blur-[160px]" />
      <div className="absolute top-48 -right-32 size-[480px] rounded-full bg-indigo-500/20 blur-[150px]" />
      <div className="to-background absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent" />
    </div>

    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-4xl flex-col items-center"
    >
      <motion.div variants={item}>
        <motion.img
          src="/stickers/bear-wave.png"
          alt=""
          width={224}
          height={224}
          className="mx-auto w-36 drop-shadow-[0_24px_48px_rgba(124,92,252,0.45)] sm:w-52"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.div
        variants={item}
        className="border-primary/30 bg-primary/10 text-primary mt-2 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold backdrop-blur"
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
