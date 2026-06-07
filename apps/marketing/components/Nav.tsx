"use client"

import { Button } from "@workspace/ui/components/button"

const links = [
  { label: "Features", href: "#" },
  { label: "Self-host", href: "#" },
  { label: "GitHub", href: "#" },
]

const Nav = () => (
  <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
    <nav className="border-border bg-card/70 flex w-full max-w-5xl items-center justify-between rounded-2xl border px-3 py-2 backdrop-blur-xl">
      <a href="#" className="flex items-center gap-2 pl-1.5">
        <span className="bg-primary flex size-6 items-center justify-center rounded-md">
          <span className="size-2.5 rounded-full bg-white" />
        </span>
        <span className="text-foreground text-[15px] font-semibold tracking-tight">Orbit</span>
      </a>
      <div className="hidden items-center gap-1 md:flex">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
          >
            {link.label}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">Log in</Button>
        <Button size="sm">Get started</Button>
      </div>
    </nav>
  </header>
)

export default Nav
