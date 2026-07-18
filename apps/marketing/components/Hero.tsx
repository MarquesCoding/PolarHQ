"use client"

import { useRef } from "react"
import {
  type MotionValue,
  type Variants,
  motion,
  useScroll,
  useTransform,
} from "motion/react"
import { Button } from "@workspace/ui/components/button"
import { AppleLogo, GithubLogo, LockKey } from "@phosphor-icons/react"

const REPO_URL = "https://github.com/MarquesCoding/PolarHQ"
const DOWNLOAD_URL = `${REPO_URL}/releases/latest`

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] } },
}

const PROPS = ["End-to-end encrypted", "Self-hosted", "Open source", "Photos · Drive · Docs · Sheets"]

// Back → front. `close` is pinned to the bottom and never moves; `mid`/`distant` sit progressively
// higher at rest (base) and slide back down on scroll (drift), collapsing toward the ridge line.
// Offsets are `%` of each layer's own height and the scroll is section-progress (0→1), so the ridge
// holds its proportions across screen sizes and browser-zoom levels instead of drifting in pixels.
const MOUNTAINS = [
  { src: "/parallax/distant_mountains.png", base: -18, drift: 18 },
  { src: "/parallax/mid_mountains.png", base: -8, drift: 12 },
  { src: "/parallax/close_mountains.png", base: 5, drift: 0 },
]

const MountainLayer = ({
  src,
  base,
  drift,
  index,
  progress,
}: {
  src: string
  base: number
  drift: number
  index: number
  progress: MotionValue<number>
}) => {
  const y = useTransform(progress, [0, 1], [`${base}%`, `${base + drift}%`])
  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden
      style={{ y }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, delay: 0.25 + index * 0.15, ease: [0.22, 0.61, 0.36, 1] }}
      className="pointer-events-none absolute bottom-0 left-0 w-full select-none"
    />
  )
}

const Hero = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })
  const shotY = useTransform(scrollYProgress, [0, 1], ["0%", "-5%"])

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex flex-col overflow-hidden px-5 pt-28 pb-12 sm:h-svh sm:min-h-[780px] sm:px-6 sm:pt-40 sm:pb-0"
    >
      {/* Layered mountain parallax over a plain background. The ridge is framed to the first viewport
          (h-svh) so it sits at the fold no matter how tall the hero grows on mobile; the sink is small
          on phones (short, width-driven mountains) and deeper on desktop. Only mid/distant drift. */}
      <div aria-hidden className="bg-background absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-svh overflow-hidden">
          <div className="absolute inset-x-0 bottom-[-6%] sm:bottom-[-34%]">
            {MOUNTAINS.map((m, i) => (
              <MountainLayer key={m.src} {...m} index={i} progress={scrollYProgress} />
            ))}
          </div>
        </div>
        {/* Subtle violet top-glow, matching the ContentHeroBackdrop on the other pages. */}
        <div className="from-primary/10 absolute inset-x-0 top-0 h-[420px] bg-gradient-to-b to-transparent" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-3xl flex-col items-center text-center dark:[text-shadow:0_1px_2px_rgb(8_8_16/0.7),0_2px_22px_rgb(8_8_16/0.55)]"
      >
        <motion.h1
          variants={item}
          className="font-display text-foreground text-[1.75rem] leading-[1.1] font-bold tracking-tight sm:text-[3rem]"
        >
          Your whole digital life,{" "}
          <span className="font-serif font-normal italic">private</span> and{" "}
          <span className="text-primary">self-hosted</span>.
        </motion.h1>

        <motion.p
          variants={item}
          className="text-foreground/85 mx-auto mt-4 max-w-lg font-medium text-pretty sm:text-lg"
        >
          An open-source suite of Photos, Drive, Docs and Sheets that runs on your own server,
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
          className="text-foreground/85 bg-background/45 mx-auto mt-6 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full px-4 py-1.5 text-xs font-medium backdrop-blur-sm"
        >
          {PROPS.map((prop) => (
            <li key={prop} className="flex items-center gap-1.5">
              <LockKey className="text-primary/70 size-3" weight="fill" />
              {prop}
            </li>
          ))}
        </motion.ul>
      </motion.div>

      {/* App screenshot, centered over the scene, cut off at the fold. */}
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative mt-12 sm:mt-24 sm:min-h-0 sm:flex-1"
      >
        <motion.div
          style={{ y: shotY }}
          className="mx-auto w-full max-w-6xl overflow-hidden rounded-t-2xl shadow-[0_-16px_80px_-24px_rgba(0,0,0,0.4)]"
        >
          <img
            src="/shots/photos.jpg"
            alt="The PolarHQ desktop app"
            width={1800}
            height={1170}
            className="block w-full"
          />
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Hero
