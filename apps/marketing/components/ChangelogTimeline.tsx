"use client"

import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"

interface ChangelogTimelineProps {
  versions: { version: string; date: string }[]
}

const ChangelogTimeline = ({ versions }: ChangelogTimelineProps) => {
  const [active, setActive] = useState(0)
  const [scrubbing, setScrubbing] = useState(false)
  const [atFooter, setAtFooter] = useState(false)
  const [footerH, setFooterH] = useState(0)
  const barsRef = useRef<HTMLDivElement>(null)

  // Park above the footer (absolute) instead of sitting on it (fixed) once it's in view.
  useEffect(() => {
    const footer = document.querySelector("footer")
    if (!footer) return
    setFooterH((footer as HTMLElement).offsetHeight)
    const observer = new IntersectionObserver(([entry]) => setAtFooter(!!entry?.isIntersecting))
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  // Scroll-spy: highlight the release nearest the middle of the viewport.
  useEffect(() => {
    const sections = versions
      .map((v) => document.getElementById(`v${v.version}`))
      .filter((el): el is HTMLElement => el !== null)
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const idx = sections.indexOf(visible.target as HTMLElement)
        if (idx >= 0) setActive(idx)
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: [0, 0.5, 1] },
    )
    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [versions])

  const scrollTo = (idx: number) => {
    document.getElementById(`v${versions[idx]?.version}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }

  const setFromClientY = (clientY: number) => {
    const el = barsRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const next = Math.round(ratio * (versions.length - 1))
    if (next !== active) {
      setActive(next)
      scrollTo(next)
    }
  }

  return (
    <div
      style={
        atFooter
          ? { position: "absolute", bottom: footerH + 32, right: 32 }
          : { position: "fixed", bottom: 32, right: 32 }
      }
      className="z-40 hidden flex-col items-end gap-3 lg:flex"
    >
      <span className="text-foreground/50 font-mono text-[10px] tracking-wider tabular-nums">
        v{versions[active]?.version}
      </span>
      <div
        ref={barsRef}
        className="flex touch-none flex-col items-end gap-2.5 py-1"
        onPointerDown={(event) => {
          event.preventDefault()
          setScrubbing(true)
          barsRef.current?.setPointerCapture(event.pointerId)
          setFromClientY(event.clientY)
        }}
        onPointerMove={(event) => {
          if (scrubbing) setFromClientY(event.clientY)
        }}
        onPointerUp={() => setScrubbing(false)}
        onPointerCancel={() => setScrubbing(false)}
      >
        {versions.map((v, i) => {
          const distance = Math.abs(i - active)
          const width = Math.max(10, 28 - distance * 5)
          const selected = i === active
          return (
            <motion.span
              key={v.version}
              aria-label={`Jump to v${v.version}`}
              onClick={() => {
                setActive(i)
                scrollTo(i)
              }}
              animate={{ width, opacity: selected ? 1 : Math.max(0.3, 1 - distance * 0.2) }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={cn(
                "h-1 cursor-pointer rounded-full",
                selected ? "bg-foreground" : "bg-foreground/55",
              )}
            />
          )
        })}
      </div>
    </div>
  )
}

export default ChangelogTimeline
