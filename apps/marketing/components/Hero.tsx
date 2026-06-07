"use client"

import { motion } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import { IconBrandGithub, IconDownload } from "@tabler/icons-react"

const Hero = () => (
  <section className="relative overflow-hidden">
    {/* Subtle brand glow on the app's dark background. */}
    <div
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px]"
      style={{
        background:
          "radial-gradient(60% 60% at 50% -8%, rgba(40,141,255,0.28), transparent 70%)",
      }}
    />

    <div className="mx-auto max-w-5xl px-6 pt-36 text-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <div className="border-border bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-medium">
          <span className="bg-primary size-1.5 rounded-full" />
          Open source · self-hosted · end-to-end encrypted
        </div>

        <h1 className="text-foreground mt-7 text-5xl font-bold tracking-tight sm:text-7xl">
          Your private home
          <br />
          for <span className="text-primary">everything.</span>
        </h1>

        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg">
          Photos, Drive and Docs — encrypted on your device, running on your server. The whole
          cloud, finally yours.
        </p>

        <div className="mt-9 flex items-center justify-center gap-3">
          <Button size="lg" className="px-6">
            <IconDownload className="size-4" />
            Download
          </Button>
          <Button size="lg" variant="outline" className="px-6">
            <IconBrandGithub className="size-4" />
            Get started
          </Button>
        </div>

        <p className="text-muted-foreground mt-5 text-[13px]">Free &amp; open source · Self-host in minutes · AGPL</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 0.61, 0.36, 1], delay: 0.15 }}
        className="relative mx-auto mt-16 w-full max-w-5xl"
      >
        <div
          className="ring-border relative overflow-hidden rounded-2xl shadow-[0_50px_120px_-30px_rgba(0,0,0,0.8)] ring-1"
          style={{ aspectRatio: "1001 / 342" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/screen.png" alt="The Orbit Photos app" className="block w-full" draggable={false} />
          <div className="to-background pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent" />
        </div>
      </motion.div>
    </div>
  </section>
)

export default Hero
