"use client"

import { IconBrandGithub } from "@tabler/icons-react"

const Nav = () => (
  <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
    <nav className="border-border bg-card/70 flex w-full max-w-3xl items-center justify-between rounded-2xl border px-4 py-2.5 backdrop-blur-xl">
      <a href="#" className="flex items-center gap-2">
        <span className="bg-primary flex size-6 items-center justify-center rounded-md">
          <span className="size-2.5 rounded-full bg-white" />
        </span>
        <span className="text-foreground text-[15px] font-semibold tracking-tight">Orbit</span>
      </a>
      <a
        href="#"
        aria-label="GitHub"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <IconBrandGithub className="size-5" />
      </a>
    </nav>
  </header>
)

export default Nav
