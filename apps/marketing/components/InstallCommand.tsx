"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { AppleLogo, Check, Copy, Terminal, WindowsLogo } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const REPO_URL = "https://github.com/MarquesCoding/PolarHQ"
const COMMANDS = {
  unix: "curl -fsSL https://dl.polarhq.app | sh",
  windows: "irm https://dl.polarhq.app/install.ps1 | iex",
} as const

type OS = keyof typeof COMMANDS

const InstallCommand = () => {
  const [os, setOs] = useState<OS>("unix")
  const [copied, setCopied] = useState(false)
  const command = COMMANDS[os]

  const select = (next: OS) => {
    setOs(next)
    setCopied(false)
  }

  const copy = () => {
    navigator.clipboard
      .writeText(command)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        /* clipboard blocked — nothing to do */
      })
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center sm:py-28">
      <div className="border-primary/25 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold">
        <Terminal className="size-3.5" weight="fill" />
        One command
      </div>
      <h2 className="font-display text-foreground mt-6 text-4xl font-bold tracking-tight sm:text-5xl">
        Self-host it in seconds
      </h2>
      <p className="text-foreground/70 mx-auto mt-5 max-w-xl text-lg text-pretty">
        One script pulls the whole suite, sets up Docker and Caddy, and hands you HTTPS on your own
        domain — nothing else to install.
      </p>

      <div className="border-foreground/10 bg-foreground/[0.04] mx-auto mt-9 inline-flex gap-1 rounded-full border p-1">
        <Button
          variant={os === "unix" ? "default" : "ghost"}
          size="sm"
          onClick={() => select("unix")}
          className="gap-1.5 rounded-full"
        >
          <AppleLogo weight="fill" className="size-4" />
          macOS / Linux
        </Button>
        <Button
          variant={os === "windows" ? "default" : "ghost"}
          size="sm"
          onClick={() => select("windows")}
          className="gap-1.5 rounded-full"
        >
          <WindowsLogo weight="fill" className="size-4" />
          Windows
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
        className="border-foreground/10 bg-foreground/[0.045] mx-auto mt-5 flex max-w-2xl items-center gap-3 rounded-2xl border p-2 pl-5 text-left backdrop-blur"
      >
        <span aria-hidden className="text-primary shrink-0 font-mono text-sm select-none">
          {os === "windows" ? ">" : "$"}
        </span>
        <code
          key={os}
          className={cn(
            "text-foreground flex-1 overflow-x-auto font-mono text-sm whitespace-nowrap sm:text-[15px]",
          )}
        >
          {command}
        </code>
        <Button
          size="sm"
          onClick={copy}
          aria-label="Copy install command"
          className="shrink-0 gap-2 rounded-xl font-semibold"
        >
          {copied ? <Check className="size-4" weight="bold" /> : <Copy className="size-4" weight="bold" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </motion.div>

      <p className="text-foreground/45 mt-4 text-xs">
        Requires Docker. Want to read it first?{" "}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          View the script on GitHub
        </a>
        .
      </p>
    </section>
  )
}

export default InstallCommand
