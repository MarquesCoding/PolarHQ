"use client"

import { useRef } from "react"
import { type MotionValue, motion, useScroll, useTransform } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import MacWindow from "@components/MacWindow"

interface PhotoConfig {
  x: number
  y: number
  rot: number
  w: number
  h: number
  seed: string
}

/// Scattered across the screen with varied aspect ratios; they converge UP toward the screenshot.
const PHOTOS: PhotoConfig[] = [
  { x: -560, y: 40, rot: -10, w: 170, h: 230, seed: "orbit-a" },
  { x: -640, y: 240, rot: -5, w: 230, h: 150, seed: "orbit-b" },
  { x: -380, y: 340, rot: 8, w: 160, h: 200, seed: "orbit-c" },
  { x: -300, y: 90, rot: 9, w: 210, h: 140, seed: "orbit-d" },
  { x: -150, y: 360, rot: -7, w: 150, h: 200, seed: "orbit-e" },
  { x: -120, y: 150, rot: 5, w: 130, h: 170, seed: "orbit-f" },
  { x: 560, y: 50, rot: 11, w: 180, h: 240, seed: "orbit-g" },
  { x: 640, y: 250, rot: 5, w: 220, h: 150, seed: "orbit-h" },
  { x: 380, y: 350, rot: -9, w: 160, h: 210, seed: "orbit-i" },
  { x: 300, y: 90, rot: -10, w: 200, h: 140, seed: "orbit-j" },
  { x: 160, y: 360, rot: 7, w: 150, h: 190, seed: "orbit-k" },
  { x: 130, y: 150, rot: -6, w: 140, h: 180, seed: "orbit-l" },
]

const TARGET_Y = -300

const FloatingPhoto = ({ progress, cfg }: { progress: MotionValue<number>; cfg: PhotoConfig }) => {
  const x = useTransform(progress, [0, 0.5], [cfg.x, 0])
  const y = useTransform(progress, [0, 0.5], [cfg.y, TARGET_Y])
  const scale = useTransform(progress, [0, 0.5], [1, 0.1])
  const opacity = useTransform(progress, [0.32, 0.5], [1, 0])
  const rotate = useTransform(progress, [0, 0.5], [cfg.rot, 0])

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 overflow-hidden rounded-2xl bg-white/5 shadow-xl ring-1 ring-white/10"
      style={{
        x,
        y,
        scale,
        opacity,
        rotate,
        width: cfg.w,
        height: cfg.h,
        marginLeft: -cfg.w / 2,
        marginTop: -cfg.h / 2,
        backgroundImage: `url(https://picsum.photos/seed/${cfg.seed}/${cfg.w * 2}/${cfg.h * 2})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  )
}

const ParallaxHero = () => {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })

  const headOpacity = useTransform(scrollYProgress, [0, 0.16], [1, 0])
  const headY = useTransform(scrollYProgress, [0, 0.16], [0, -40])
  const macScale = useTransform(scrollYProgress, [0.32, 0.62], [0.86, 1])
  const macOpacity = useTransform(scrollYProgress, [0.36, 0.56], [0, 1])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0])

  return (
    <section ref={ref} className="relative h-[320vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {PHOTOS.map((cfg, i) => (
          <FloatingPhoto key={i} progress={scrollYProgress} cfg={cfg} />
        ))}

        <motion.div
          style={{ opacity: headOpacity, y: headY }}
          className="absolute top-1/2 left-1/2 z-10 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 px-6 text-center"
        >
          <h1 className="text-foreground text-5xl font-extrabold tracking-tight sm:text-7xl">
            One private home
            <br />
            for everything.
          </h1>
          <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg">
            Self-hosted Photos, Drive, Docs and more — end-to-end encrypted, and entirely yours.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" className="px-6">Get started</Button>
            <Button size="lg" variant="ghost" className="px-6">View on GitHub</Button>
          </div>
        </motion.div>

        <motion.div
          style={{ scale: macScale, opacity: macOpacity }}
          className="absolute left-1/2 top-[9%] z-20 w-[min(92vw,940px)] -translate-x-1/2 origin-top"
        >
          <MacWindow />
        </motion.div>

        <motion.div
          style={{ opacity: hintOpacity }}
          className="text-muted-foreground absolute bottom-8 left-1/2 -translate-x-1/2 text-sm"
        >
          Scroll to bring it together ↓
        </motion.div>
      </div>
    </section>
  )
}

export default ParallaxHero
