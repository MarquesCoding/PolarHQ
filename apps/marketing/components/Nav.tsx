"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AnimatePresence, motion } from "motion/react"
import { IconBrandGithubFilled, IconMenu2, IconX } from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const LINKS = [
  { label: "Blog", href: "/blog" },
  { label: "Changelog", href: "/changelog" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
]

const isActive = (pathname: string, href: string): boolean =>
  href === "/" ? pathname === "/" : pathname.startsWith(href)

const Nav = () => {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 1.1, ease: [0.22, 0.61, 0.36, 1] }}
      className={cn(
        "fixed inset-x-0 z-50 mx-auto w-fit rounded-2xl border transition-all duration-300",
        scrolled || open
          ? "border-white/10 bg-black/60 backdrop-blur-md top-3"
          : "border-transparent top-12",
      )}
    >
      <nav className="flex h-12 items-center gap-6 px-4 sm:gap-8 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="PolarHQ" width={24} height={24} className="size-6" priority />
          <span className="text-foreground text-[15px] font-semibold tracking-tight">PolarHQ</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href)
            return (
              <Link
                key={link.label}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative text-sm transition-colors",
                  active ? "text-foreground" : "text-foreground/70 hover:text-foreground",
                )}
              >
                {link.label}
                {active ? (
                  <motion.span
                    layoutId="nav-active-dot"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="bg-foreground absolute -bottom-1.5 left-1/2 -ml-0.5 size-1 rounded-full"
                  />
                ) : null}
              </Link>
            )
          })}
        </div>

        <a
          href="#"
          aria-label="GitHub"
          className="text-muted-foreground hover:text-foreground hidden transition-colors md:block"
        >
          <IconBrandGithubFilled className="size-5" />
        </a>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Menu"
          aria-expanded={open}
          className="md:hidden"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <IconX className="size-5" /> : <IconMenu2 className="size-5" />}
        </Button>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 0.61, 0.36, 1] }}
            className="overflow-hidden md:hidden"
          >
            <div className="flex flex-col gap-1 px-2 pb-2">
              {LINKS.map((link) => {
                const active = isActive(pathname, link.href)
                return (
                  <Link
                    key={link.label}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "text-foreground bg-white/10"
                        : "text-foreground/80 hover:text-foreground hover:bg-white/5",
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}
              <a
                href="#"
                onClick={() => setOpen(false)}
                className="text-foreground/80 hover:text-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-white/5"
              >
                <IconBrandGithubFilled className="size-4" />
                GitHub
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  )
}

export default Nav
