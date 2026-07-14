"use client"

import { type Variants, motion } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import { RELEASES } from "@lib/changelog"
import {
  AppleLogo,
  GithubLogo,
  LinuxLogo,
  LockKey,
  ShieldCheck,
  WindowsLogo,
} from "@phosphor-icons/react"

const REPO_URL = "https://github.com/MarquesCoding/PolarHQ"
const DOWNLOAD_URL = `${REPO_URL}/releases/latest`
const VERSION = RELEASES[0]?.version ?? "0.5.0-alpha"

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] } },
}

const PROPS = [
  "End-to-end encrypted",
  "Self-hosted",
  "Open source",
  "Photos · Drive · Docs · Sheets",
]

const Hero = () => (
  <section className="relative isolate flex min-h-svh flex-col overflow-hidden px-6 pt-32 pb-0 sm:pt-36">
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div className="from-primary/10 absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b to-transparent" />
    </div>

    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex w-full max-w-3xl flex-col items-center text-center"
    >
      <motion.a
        variants={item}
        href={`${REPO_URL}/releases/latest`}
        target="_blank"
        rel="noreferrer"
        className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
      >
        <ShieldCheck className="size-3.5" weight="fill" />
        Own your data — alpha v{VERSION}
      </motion.a>

      <motion.h1
        variants={item}
        className="font-display text-foreground mt-6 text-[2.75rem] leading-[1.02] font-bold tracking-tight sm:text-[4.25rem]"
      >
        Your whole digital life,
        <br />
        <span className="font-serif font-normal italic">private</span> and{" "}
        <span className="text-primary">self-hosted</span>.
      </motion.h1>

      <motion.p
        variants={item}
        className="text-foreground/65 mx-auto mt-6 max-w-xl text-lg text-pretty sm:text-xl"
      >
        PolarHQ is an open-source suite — Photos, Drive, Docs and Sheets — that runs on your own
        server. Every file is end-to-end encrypted, so nobody but you can read it. No subscriptions,
        no lock-in, no one mining your library.
      </motion.p>

      <motion.div variants={item} className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
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

      <motion.ul
        variants={item}
        className="text-foreground/60 mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium"
      >
        {PROPS.map((prop) => (
          <li key={prop} className="flex items-center gap-1.5">
            <LockKey className="text-primary/70 size-3.5" weight="fill" />
            {prop}
          </li>
        ))}
      </motion.ul>

      <motion.div
        variants={item}
        className="text-foreground/45 mt-6 flex items-center gap-4 text-sm"
      >
        <span className="flex items-center gap-1.5">
          <AppleLogo className="size-4" /> macOS
        </span>
        <span className="flex items-center gap-1.5">
          <WindowsLogo className="size-4" /> Windows
        </span>
        <span className="flex items-center gap-1.5">
          <LinuxLogo className="size-4" /> Linux
        </span>
      </motion.div>
    </motion.div>

    {/* App shot fills the rest of the hero and is cut off at the fold, fading 100% → 50% top-to-bottom. */}
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
      className="relative mt-12 min-h-[280px] flex-1 sm:mt-16"
    >
      <div
        className="border-foreground/10 mx-auto h-full max-w-6xl overflow-hidden rounded-t-2xl border border-b-0 shadow-[0_-8px_70px_-16px_rgba(0,0,0,0.3)]"
        style={{
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 100%)",
        }}
      >
        <img
          src="/landing.jpg"
          alt="The PolarHQ desktop app"
          width={2400}
          height={1350}
          className="h-full w-full object-cover object-top"
        />
      </div>
    </motion.div>
  </section>
)

export default Hero
