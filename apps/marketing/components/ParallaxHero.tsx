"use client"

import { useRef } from "react"
import { type MotionValue, motion, useScroll, useTransform } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import MacWindow from "@components/MacWindow"

interface PhotoConfig {
  x: number
  y: number
  rot: number
  size: number
  gradient: string
}

const PHOTOS: PhotoConfig[] = [
  { x: -560, y: -200, rot: -12, size: 150, gradient: "linear-gradient(135deg,#f6d365,#fda085)" },
  { x: -620, y: 120, rot: -6, size: 130, gradient: "linear-gradient(135deg,#84fab0,#8fd3f4)" },
  { x: -380, y: 280, rot: 9, size: 160, gradient: "linear-gradient(135deg,#a18cd1,#fbc2eb)" },
  { x: -300, y: -300, rot: 11, size: 130, gradient: "linear-gradient(135deg,#5ee7df,#b490ca)" },
  { x: -160, y: 300, rot: -7, size: 120, gradient: "linear-gradient(135deg,#0ba360,#3cba92)" },
  { x: -120, y: -360, rot: 6, size: 120, gradient: "linear-gradient(135deg,#fc5c7d,#6a82fb)" },
  { x: 560, y: -190, rot: 12, size: 150, gradient: "linear-gradient(135deg,#2980b9,#6dd5fa)" },
  { x: 620, y: 130, rot: 6, size: 130, gradient: "linear-gradient(135deg,#f093fb,#f5576c)" },
  { x: 380, y: 290, rot: -9, size: 160, gradient: "linear-gradient(135deg,#4facfe,#00f2fe)" },
  { x: 300, y: -300, rot: -11, size: 130, gradient: "linear-gradient(135deg,#ffecd2,#fcb69f)" },
  { x: 170, y: 310, rot: 7, size: 120, gradient: "linear-gradient(135deg,#11998e,#38ef7d)" },
  { x: 130, y: -360, rot: -5, size: 120, gradient: "linear-gradient(135deg,#667eea,#764ba2)" },
]

const FloatingPhoto = ({ progress, cfg }: { progress: MotionValue<number>; cfg: PhotoConfig }) => {
  const x = useTransform(progress, [0, 0.5], [cfg.x, 0])
  const y = useTransform(progress, [0, 0.5], [cfg.y, 0])
  const scale = useTransform(progress, [0, 0.5], [1, 0.12])
  const opacity = useTransform(progress, [0.3, 0.5], [1, 0])
  const rotate = useTransform(progress, [0, 0.5], [cfg.rot, 0])

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 rounded-2xl shadow-xl ring-1 ring-black/5"
      style={{
        x,
        y,
        scale,
        opacity,
        rotate,
        width: cfg.size,
        height: cfg.size,
        marginLeft: -cfg.size / 2,
        marginTop: -cfg.size / 2,
        backgroundImage: cfg.gradient,
      }}
    />
  )
}

const ParallaxHero = () => {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })

  const headOpacity = useTransform(scrollYProgress, [0, 0.16], [1, 0])
  const headY = useTransform(scrollYProgress, [0, 0.16], [0, -48])
  const macScale = useTransform(scrollYProgress, [0.3, 0.64], [0.82, 1])
  const macOpacity = useTransform(scrollYProgress, [0.34, 0.56], [0, 1])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0])

  return (
    <section ref={ref} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        {PHOTOS.map((cfg, i) => (
          <FloatingPhoto key={i} progress={scrollYProgress} cfg={cfg} />
        ))}

        <motion.div
          style={{ opacity: headOpacity, y: headY }}
          className="absolute z-10 mx-auto max-w-3xl px-6 text-center"
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
            <Button size="lg" className="rounded-full px-6">Get started</Button>
            <Button size="lg" variant="ghost" className="rounded-full px-6">View on GitHub</Button>
          </div>
        </motion.div>

        <motion.div
          style={{ scale: macScale, opacity: macOpacity }}
          className="relative z-20 w-full max-w-4xl px-6"
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
