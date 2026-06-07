"use client"

import { motion } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import { Icon } from "@lib/icons"

const STEPS = [
  { n: "01", title: "Pull the image", body: "Grab the latest Orbit release with a single Docker command." },
  { n: "02", title: "Set your secrets", body: "Drop in your domain and an auth secret — sane defaults for everything else." },
  { n: "03", title: "Launch", body: "Bring it up with compose and open your browser. You're hosting your own cloud." },
]

const Setup = () => (
  <section id="setup" className="mx-auto max-w-6xl px-6 py-28">
    <div className="border-border bg-card overflow-hidden rounded-[2rem] border">
      <div className="grid lg:grid-cols-2">
        <div className="p-10 sm:p-14">
          <h2 className="text-foreground text-4xl font-extrabold tracking-tight">
            Run it yourself in minutes
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Orbit is AGPL and self-hostable. No accounts to create, no data leaving your server.
          </p>

          <div className="mt-10 space-y-7">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4"
              >
                <span className="text-primary text-sm font-bold tabular-nums">{step.n}</span>
                <div>
                  <div className="text-foreground font-semibold">{step.title}</div>
                  <div className="text-muted-foreground mt-0.5 text-sm">{step.body}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button className="rounded-full px-5">
              <Icon name="download" className="size-4" />
              Download for iOS
            </Button>
            <Button variant="outline" className="rounded-full px-5">
              Read the docs
            </Button>
          </div>
        </div>

        <div className="bg-[#0e0e11] p-10 sm:p-14">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
          </div>
          <pre className="mt-6 overflow-x-auto font-mono text-[13px] leading-relaxed text-white/85">
            <code>{`# 1. Grab the compose file
curl -O https://orbit.app/docker-compose.yml

# 2. Configure your instance
export ORBIT_DOMAIN=cloud.example.com
export AUTH_SECRET=$(openssl rand -hex 32)

# 3. Launch the whole suite
docker compose up -d

# ✨ Open https://cloud.example.com`}</code>
          </pre>
        </div>
      </div>
    </div>
  </section>
)

export default Setup
