"use client"

import { useState } from "react"
import { motion } from "motion/react"
import {
  AppleLogo,
  Check,
  Copy,
  StackSimple,
  Terminal,
  WindowsLogo,
} from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/button"
import { DOCKER_COMPOSE } from "@lib/dockerCompose"

const REPO_URL = "https://github.com/MarquesCoding/PolarHQ"
const COMMANDS = {
  unix: "curl -fsSL https://dl.polarhq.app | sh",
  windows: "irm https://dl.polarhq.app/install.ps1 | iex",
} as const

type OS = keyof typeof COMMANDS

const InstallCommand = () => {
  const [os, setOs] = useState<OS>("unix")
  const [copied, setCopied] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [copiedCompose, setCopiedCompose] = useState(false)
  const command = COMMANDS[os]

  const select = (next: OS) => {
    setOs(next)
    setCopied(false)
  }

  const copyText = (text: string, mark: (value: boolean) => void) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        mark(true)
        window.setTimeout(() => mark(false), 2000)
      })
      .catch(() => {})
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
        domain. Nothing else to install.
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
        <code className="text-foreground flex-1 overflow-x-auto font-mono text-sm whitespace-nowrap sm:text-[15px]">
          {command}
        </code>
        <Button
          size="sm"
          onClick={() => copyText(command, setCopied)}
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

      <div className="mt-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCompose((value) => !value)}
          className="text-foreground/70 gap-2 rounded-full"
        >
          <StackSimple className="size-4" weight="fill" />
          {showCompose ? "Hide docker-compose.yml" : "Prefer Docker Compose? Copy the file"}
        </Button>

        {showCompose ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
            className="mt-4"
          >
            <div className="border-foreground/10 bg-foreground/[0.03] overflow-hidden rounded-2xl border text-left">
              <div className="border-foreground/10 flex items-center justify-between border-b px-4 py-2">
                <span className="text-foreground/55 font-mono text-xs">docker-compose.yml</span>
                <Button
                  size="sm"
                  onClick={() => copyText(DOCKER_COMPOSE, setCopiedCompose)}
                  aria-label="Copy docker-compose.yml"
                  className="h-7 gap-1.5 rounded-lg text-xs font-semibold"
                >
                  {copiedCompose ? (
                    <Check className="size-3.5" weight="bold" />
                  ) : (
                    <Copy className="size-3.5" weight="bold" />
                  )}
                  {copiedCompose ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="text-foreground/85 max-h-[420px] overflow-auto px-4 py-3 text-left font-mono text-[12px] leading-relaxed">
                <code>{DOCKER_COMPOSE}</code>
              </pre>
            </div>
            <p className="text-foreground/45 mt-3 text-xs">
              Paste into Dockge / Portainer or run{" "}
              <code className="text-foreground/70 font-mono">docker compose up -d</code>. Change{" "}
              <code className="text-foreground/70 font-mono">AUTH_SECRET</code> and the URLs first.
            </p>
          </motion.div>
        ) : null}
      </div>
    </section>
  )
}

export default InstallCommand
