"use client"

import { type Variants, motion } from "motion/react"
import { ImageDithering } from "@paper-design/shaders-react"
import { Button } from "@workspace/ui/components/button"
import { RELEASES } from "@lib/changelog"
import { AppleLogo, GithubLogo, LockKey, ShieldCheck } from "@phosphor-icons/react"

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

const PROPS = ["End-to-end encrypted", "Self-hosted", "Open source", "Photos · Drive · Docs · Sheets"]

const Hero = () => (
  <section className="relative isolate flex flex-col overflow-hidden px-5 pt-28 pb-12 sm:h-svh sm:min-h-[780px] sm:px-6 sm:pt-36 sm:pb-0">
    {/* Dithered scenic background (Paper Design shader over landing.jpg) — faded in low so the top
        stays clean for the copy, and muted so it reads as a backdrop, not noise. */}
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 42%, black 72%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.35) 42%, black 72%)",
        }}
      >
        <ImageDithering
          image="/landing.jpg"
          width="100%"
          height="100%"
          fit="cover"
          originalColors
          type="4x4"
          size={2}
          colorSteps={6}
        />
      </div>
      <div className="from-background absolute inset-x-0 top-0 h-52 bg-gradient-to-b to-transparent" />
    </div>

    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex w-full max-w-3xl flex-col items-center text-center"
    >
      <motion.a
        variants={item}
        href={DOWNLOAD_URL}
        target="_blank"
        rel="noreferrer"
        className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold backdrop-blur transition-colors"
      >
        <ShieldCheck className="size-3.5" weight="fill" />
        Own your data — alpha v{VERSION}
      </motion.a>

      <motion.h1
        variants={item}
        className="font-display text-foreground mt-5 text-[1.75rem] leading-[1.1] font-bold tracking-tight sm:text-[3rem]"
      >
        Your whole digital life,{" "}
        <span className="font-serif font-normal italic">private</span> and{" "}
        <span className="text-primary">self-hosted</span>.
      </motion.h1>

      <motion.p
        variants={item}
        className="text-foreground/65 mx-auto mt-4 max-w-lg text-pretty sm:text-lg"
      >
        An open-source suite — Photos, Drive, Docs and Sheets — that runs on your own server,
        end-to-end encrypted. No subscriptions, no lock-in, no one mining your library.
      </motion.p>

      <motion.div variants={item} className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
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
          className="bg-background/60 gap-2 rounded-xl px-6 text-base font-semibold backdrop-blur"
        >
          <GithubLogo className="size-4" weight="fill" />
          Star on GitHub
        </Button>
      </motion.div>

      <motion.ul
        variants={item}
        className="text-foreground/60 mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[13px] font-medium"
      >
        {PROPS.map((prop) => (
          <li key={prop} className="flex items-center gap-1.5">
            <LockKey className="text-primary/70 size-3" weight="fill" />
            {prop}
          </li>
        ))}
      </motion.ul>
    </motion.div>

    {/* App screenshot, centered over the dithered background, cut off at the fold, fading 100% → 50%. */}
    <motion.div
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
      className="relative mt-8 overflow-hidden sm:mt-10 sm:min-h-0 sm:flex-1"
    >
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-t-2xl shadow-[0_-16px_80px_-24px_rgba(0,0,0,0.4)]">
        <img
          src="/shots/shot-1.jpg"
          alt="The PolarHQ desktop app"
          width={1658}
          height={1099}
          className="block w-full origin-top scale-[1.03]"
        />
      </div>
    </motion.div>
  </section>
)

export default Hero
