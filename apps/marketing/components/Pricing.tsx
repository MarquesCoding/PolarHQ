"use client"

import { motion } from "motion/react"
import { Button } from "@workspace/ui/components/button"
import { Icon } from "@lib/icons"
import { cn } from "@workspace/ui/lib/utils"

interface Plan {
  name: string
  price: string
  period?: string
  blurb: string
  features: string[]
  cta: string
  highlight?: boolean
}

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    blurb: "For getting started.",
    features: ["5 GB storage", "Photos & Drive", "End-to-end encrypted", "All your devices"],
    cta: "Get started",
  },
  {
    name: "Pro",
    price: "$4.99",
    period: "/mo",
    blurb: "For your whole digital life.",
    features: ["200 GB storage", "All apps included", "Docs, Sheets & Slides", "Live sync everywhere"],
    cta: "Choose Pro",
    highlight: true,
  },
  {
    name: "Ultimate",
    price: "$8.99",
    period: "/mo",
    blurb: "For power users.",
    features: ["200 GB storage", "All apps included", "Sharing & collaboration", "Priority support"],
    cta: "Choose Ultimate",
  },
  {
    name: "Enterprise",
    price: "Contact us",
    blurb: "For teams & organisations.",
    features: ["Up to 1 TB / user", "All apps included", "OIDC, SSO & SCIM", "Dedicated support"],
    cta: "Contact sales",
  },
]

const Pricing = () => (
  <section id="pricing" className="mx-auto max-w-6xl px-6 py-28">
    <div className="text-center">
      <h2 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl">
        Simple, honest pricing
      </h2>
      <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
        Or self-host the whole thing for free, forever. Your server, your rules.
      </p>
    </div>

    <div className="mt-14 grid gap-4 lg:grid-cols-4">
      {PLANS.map((plan, i) => (
        <motion.div
          key={plan.name}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, delay: i * 0.07 }}
          className={cn(
            "flex flex-col rounded-3xl border p-7",
            plan.highlight
              ? "border-primary bg-card ring-primary/30 shadow-lg ring-1"
              : "border-border bg-card",
          )}
        >
          {plan.highlight ? (
            <span className="bg-primary text-primary-foreground mb-4 w-fit rounded-full px-3 py-1 text-xs font-semibold">
              Most popular
            </span>
          ) : null}
          <h3 className="text-foreground text-lg font-bold">{plan.name}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{plan.blurb}</p>
          <div className="mt-5 flex items-baseline gap-1">
            <span className="text-foreground text-3xl font-extrabold tracking-tight">{plan.price}</span>
            {plan.period ? <span className="text-muted-foreground text-sm">{plan.period}</span> : null}
          </div>
          <Button
            variant={plan.highlight ? "default" : "outline"}
            className="mt-6 w-full"
          >
            {plan.cta}
          </Button>
          <ul className="mt-7 space-y-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-2.5">
                <Icon name="circle-check" className="text-primary size-4 shrink-0" />
                <span className="text-foreground/80 text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      ))}
    </div>
  </section>
)

export default Pricing
