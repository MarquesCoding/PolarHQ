"use client"

import { Button } from "@workspace/ui/components/button"

const links = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Self-host", href: "#setup" },
]

const Nav = () => (
  <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
    <nav className="flex w-full max-w-5xl items-center justify-between rounded-full border border-black/5 bg-white/70 px-4 py-2.5 shadow-sm backdrop-blur-xl">
      <a href="#" className="flex items-center gap-2 pl-1">
        <span className="bg-primary flex size-7 items-center justify-center rounded-lg">
          <span className="size-3 rounded-full bg-white" />
        </span>
        <span className="text-lg font-bold tracking-tight">Orbit</span>
      </a>
      <div className="hidden items-center gap-1 md:flex">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-muted-foreground hover:text-foreground rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
          >
            {link.label}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="rounded-full">Log in</Button>
        <Button size="sm" className="rounded-full px-4">Get started</Button>
      </div>
    </nav>
  </header>
)

export default Nav
