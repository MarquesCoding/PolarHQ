import Image from "next/image"
import { DiscordLogo, GithubLogo, XLogo } from "@phosphor-icons/react/ssr"

interface Column {
  title: string
  links: string[]
}

const SOCIALS = [
  { label: "GitHub", icon: GithubLogo },
  { label: "X", icon: XLogo },
  { label: "Discord", icon: DiscordLogo },
]

const COLUMNS: Column[] = [
  { title: "Product", links: ["FAQ", "Blog", "Changelog", "Roadmap"] },
  { title: "Open source", links: ["Open Collective", "Product Hunt"] },
  { title: "Pages", links: ["Privacy", "Terms", "Waitlist"] },
]

const HREFS: Record<string, string> = {
  Blog: "/blog",
  Changelog: "/changelog",
  Roadmap: "/roadmap",
  Privacy: "/privacy",
  Terms: "/terms",
}

const Footer = () => (
  <footer className="relative isolate overflow-hidden pt-24">
    <div className="mx-auto max-w-6xl px-6">
      <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="PolarHQ" width={24} height={24} className="size-6" />
            <span className="text-foreground text-base font-semibold tracking-tight">PolarHQ</span>
          </div>
          <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
            A self-hosted home for your photos, files and documents. Open source, end to end
            encrypted, and entirely yours to run. AGPL licensed.
          </p>
          <div className="mt-6 flex items-center gap-4">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href="#"
                aria-label={social.label}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <social.icon className="size-5" />
              </a>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-14 gap-y-10 sm:grid-cols-3">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                {column.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href={HREFS[link] ?? "#"}
                      className="text-foreground/80 hover:text-foreground text-[15px] transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

    </div>

    <div
      aria-hidden
      className="wordmark text-foreground/[0.04] pointer-events-none mt-10 -mb-[0.12em] w-full overflow-hidden text-center text-[18vw] leading-none whitespace-nowrap select-none"
    >
      PolarHQ
    </div>

    <div className="mx-auto max-w-6xl px-6">
      <div className="border-border/40 border-t py-6">
        <span className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} PolarHQ. AGPL licensed.
        </span>
      </div>
    </div>
  </footer>
)

export default Footer
