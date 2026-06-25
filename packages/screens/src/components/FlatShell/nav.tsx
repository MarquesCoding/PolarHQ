import { type ReactNode } from "react"
import { AppLink as Link } from "@workspace/screens/platform"
import { Icon } from "@workspace/screens/icons"
import { cn } from "@workspace/ui/lib/utils"
import { type Variants, motion } from "motion/react"

/** All nav rows across a sidebar share this layoutId so the active pill animates between them. */
export const NAV_LAYOUT_ID = "flat-nav-active"

const navSpring = { type: "spring" as const, stiffness: 520, damping: 40 }

/** Entrance variant for a single sidebar row. The nav container (see `FlatSidebar`) staggers these
 *  on mount, so the menu fans in when you switch between apps. */
export const navItemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] } },
}

const MotionLink = motion.create(Link)

export const ActiveBg = () => (
  <motion.span
    layoutId={NAV_LAYOUT_ID}
    transition={navSpring}
    className="bg-sidebar-accent absolute inset-0 rounded-lg"
  />
)

export const SectionLabel = ({ children }: { children: ReactNode }) => (
  <motion.p
    variants={navItemVariants}
    className="text-muted-foreground/70 px-2 pt-2 pb-1 text-[11px] font-medium tracking-wider uppercase"
  >
    {children}
  </motion.p>
)

export const navRowClass = (active: boolean, compact?: boolean): string =>
  cn(
    "relative flex items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
    compact ? "py-1.5" : "py-2",
    active
      ? "text-foreground font-medium"
      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40",
  )

interface NavRowProps {
  href: string
  icon: string
  label: ReactNode
  active: boolean
  badge?: number | string
  compact?: boolean
  newTab?: boolean
}

export const NavRow = ({ href, icon, label, active, badge, compact, newTab }: NavRowProps) => (
  <MotionLink
    href={href}
    target={newTab ? "_blank" : undefined}
    variants={navItemVariants}
    className={navRowClass(active, compact)}
  >
    {active ? <ActiveBg /> : null}
    <Icon name={icon} className={cn("relative shrink-0", compact ? "size-4" : "size-[18px]")} />
    <span className="relative min-w-0 flex-1 truncate">{label}</span>
    {badge !== undefined && badge !== 0 ? (
      <span className="bg-sidebar-accent text-muted-foreground relative rounded-md px-1.5 text-xs tabular-nums">
        {badge}
      </span>
    ) : null}
  </MotionLink>
)
