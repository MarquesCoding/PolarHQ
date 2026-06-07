"use client"

import { Button } from "@workspace/ui/components/button"

const COLUMNS = [
  { title: "Product", links: ["Photos", "Drive", "Docs", "Pricing"] },
  { title: "Developers", links: ["Self-host", "Documentation", "GitHub", "Status"] },
  { title: "Company", links: ["About", "Blog", "Privacy", "Terms"] },
]

const Footer = () => (
  <footer className="relative overflow-hidden border-t border-black/5 pt-24">
    <div className="mx-auto max-w-4xl px-6 text-center">
      <h2 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-6xl">
        Take back your cloud.
      </h2>
      <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-lg">
        Private by design, self-hosted by choice. Your data has a new home.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button size="lg" className="rounded-full px-6">Get started free</Button>
        <Button size="lg" variant="outline" className="rounded-full px-6">View on GitHub</Button>
      </div>
    </div>

    <div className="mx-auto mt-24 grid max-w-5xl grid-cols-2 gap-8 px-6 sm:grid-cols-4">
      <div className="col-span-2 sm:col-span-1">
        <div className="flex items-center gap-2">
          <span className="bg-primary flex size-7 items-center justify-center rounded-lg">
            <span className="size-3 rounded-full bg-white" />
          </span>
          <span className="text-lg font-bold tracking-tight">Orbit</span>
        </div>
        <p className="text-muted-foreground mt-3 text-sm">Your private home for everything.</p>
      </div>
      {COLUMNS.map((col) => (
        <div key={col.title}>
          <div className="text-foreground text-sm font-semibold">{col.title}</div>
          <ul className="mt-3 space-y-2">
            {col.links.map((link) => (
              <li key={link}>
                <a href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    <div className="text-muted-foreground mx-auto mt-16 max-w-5xl px-6 text-xs">
      © {new Date().getFullYear()} Orbit. AGPL-licensed and proudly self-hostable.
    </div>

    <div aria-hidden className="pointer-events-none mt-2 select-none overflow-hidden">
      <div className="wordmark translate-y-[18%] text-center text-[26vw] text-black/[0.04]">Orbit</div>
    </div>
  </footer>
)

export default Footer
