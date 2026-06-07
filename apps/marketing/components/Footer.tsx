"use client"

import { Button } from "@workspace/ui/components/button"
import { IconBrandGithub, IconDownload } from "@tabler/icons-react"

const Footer = () => (
  <footer className="relative mt-32 overflow-hidden">
    <div className="mx-auto max-w-3xl px-6 text-center">
      <h2 className="text-foreground text-4xl font-bold tracking-tight sm:text-5xl">
        Take back your cloud.
      </h2>
      <p className="text-muted-foreground mx-auto mt-4 max-w-md text-lg">
        Open source, self-hosted, and private by design.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button size="lg" className="px-6">
          <IconDownload className="size-4" />
          Download
        </Button>
        <Button size="lg" variant="outline" className="px-6">
          <IconBrandGithub className="size-4" />
          GitHub
        </Button>
      </div>
    </div>

    <div className="border-border mx-auto mt-20 flex max-w-5xl flex-wrap items-center justify-between gap-4 border-t px-6 py-8 text-xs">
      <span className="text-muted-foreground">© {new Date().getFullYear()} Orbit · AGPL</span>
      <div className="text-muted-foreground flex gap-5">
        <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
        <a href="#" className="hover:text-foreground transition-colors">Docs</a>
        <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
      </div>
    </div>

    <div aria-hidden className="pointer-events-none select-none overflow-hidden">
      <div className="wordmark text-foreground/[0.04] translate-y-[22%] text-center text-[26vw]">Orbit</div>
    </div>
  </footer>
)

export default Footer
