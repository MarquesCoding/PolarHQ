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
import { GithubLogo, LockKey } from "@phosphor-icons/react"
import DownloadButton from "@components/DownloadButton"

const REPO_URL = "https://github.com/MarquesCoding/PolarHQ"

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 0.61, 0.36, 1] } },
}

const PROPS = ["End-to-end encrypted", "Self-hosted", "Open source", "Photos · Drive · Docs · Sheets"]

// Back → front. Each layer covers the ridge band (object-cover) so it frames identically at any
// width — no upscaling-taller as the screen grows. On scroll every layer drifts down at its own
// speed (the closer, the faster) for real parallax depth; `scale` gives headroom so the drift
// never exposes a transparent edge.
const MOUNTAINS = [
  { src: "/parallax/distant_mountains.png", drift: 6 },
  { src: "/parallax/mid_mountains.png", drift: 13 },
  { src: "/parallax/close_mountains.png", drift: 22 },
]

const MountainLayer = ({
  src,
  drift,
  index,
  progress,
}: {
  src: string
  drift: number
  index: number
  progress: MotionValue<number>
}) => {
  const y = useTransform(progress, [0, 1], [`${-drift}%`, `${drift}%`])
  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden
      style={{ y }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.9, delay: index * 0.12, ease: [0.22, 0.61, 0.36, 1] }}
      className="pointer-events-none absolute inset-0 h-full w-full scale-[1.5] object-cover object-[50%_38%] select-none"
    />
  )
}

const Hero = () => {
  const ridgeRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ridgeRef,
    offset: ["start end", "end start"],
  })

  return (
    <section className="relative isolate flex flex-col overflow-hidden px-5 pt-28 pb-0 sm:px-6 sm:pt-40">
      <div
        aria-hidden
        className="from-primary/10 pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b to-transparent"
      />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto flex w-full max-w-3xl flex-col items-center text-center"
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
          <DownloadButton className="gap-2 rounded-xl px-6 text-base font-semibold" />
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
          className="text-foreground/70 mt-6 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium"
        >
          {PROPS.map((prop) => (
            <li key={prop} className="flex items-center gap-1.5">
              <LockKey className="text-primary/70 size-3" weight="fill" />
              {prop}
            </li>
          ))}
        </motion.ul>
      </motion.div>

      {/* App screenshot — the full window, entirely visible, sitting above the ridge. */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative z-10 mx-auto mt-10 w-full max-w-5xl sm:mt-14"
      >
        <div className="overflow-hidden rounded-2xl shadow-[0_40px_120px_-30px_rgba(0,0,0,0.45)]">
          <img
            src="/shots/photos.jpg"
            alt="The PolarHQ desktop app"
            width={1800}
            height={1170}
            className="block w-full"
          />
        </div>
      </motion.div>

      {/* Full-bleed parallax ridge below the app — one continuous horizon band, edge to edge on any
          width. object-cover keeps the framing constant; the band bleeds past the section padding. */}
      <div
        ref={ridgeRef}
        aria-hidden
        className="relative -mx-5 -mt-[8%] h-[40vh] max-h-[420px] min-h-[220px] overflow-hidden sm:-mx-6"
      >
        {MOUNTAINS.map((m, i) => (
          <MountainLayer key={m.src} {...m} index={i} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  )
}

export default Hero
