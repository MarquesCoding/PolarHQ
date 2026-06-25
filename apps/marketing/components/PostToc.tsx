"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import { ListBullets } from "@phosphor-icons/react"
import { cn } from "@workspace/ui/lib/utils"

interface Heading {
  id: string
  text: string
  level: number
}

const PostToc = () => {
  const [headings, setHeadings] = useState<Heading[]>([])
  const [active, setActive] = useState("")
  const [atFooter, setAtFooter] = useState(false)
  const [footerH, setFooterH] = useState(0)

  useEffect(() => {
    const footer = document.querySelector("footer")
    if (!footer) return
    setFooterH((footer as HTMLElement).offsetHeight)
    const observer = new IntersectionObserver(([entry]) => setAtFooter(!!entry?.isIntersecting))
    observer.observe(footer)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const titleEl = document.getElementById("top")
    const headingEls = Array.from(
      document.querySelectorAll<HTMLElement>("article h2, article h3"),
    ).filter((el) => el.id)
    const els = [titleEl, ...headingEls].filter((el): el is HTMLElement => Boolean(el))
    setHeadings(
      els.map((el) => ({
        id: el.id,
        text: el.textContent ?? "",
        level: el.tagName === "H3" ? 3 : 2,
      })),
    )
    if (!els.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: "-12% 0px -75% 0px", threshold: [0, 1] },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  if (headings.length < 2) return null

  return (
    <nav
      style={
        atFooter
          ? { position: "absolute", bottom: footerH + 32, right: 32 }
          : { position: "fixed", bottom: 32, right: 32 }
      }
      className="z-40 hidden max-h-[60vh] w-56 overflow-auto xl:block"
    >
      <div className="text-muted-foreground mb-3 flex items-center gap-2 text-xs font-medium">
        <ListBullets className="size-4" />
        On this page
      </div>
      <ul className="space-y-2.5">
        {headings.map((h) => {
          const isActive = active === h.id
          return (
            <li key={h.id} className={cn("relative", h.level === 3 && "pl-4")}>
              {isActive ? (
                <motion.span
                  layoutId="toc-active"
                  className="bg-primary absolute top-1 -left-3 h-3.5 w-0.5 rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              ) : null}
              <a
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
                className={cn(
                  "block text-sm leading-snug transition-colors duration-300",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {h.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default PostToc
