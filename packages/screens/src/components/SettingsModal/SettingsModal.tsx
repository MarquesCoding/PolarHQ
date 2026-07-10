import { type ReactNode, useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Icon } from "@workspace/screens/icons"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { MagnifyingGlass, X } from "@phosphor-icons/react"
import { motion } from "motion/react"
import { navRowClass } from "@components/FlatShell"

export interface SettingsNavItem {
  id: string
  label: string
  icon: string
}

export interface SettingsNavGroup {
  label?: string
  items: SettingsNavItem[]
}

interface SettingsModalProps {
  header: ReactNode
  groups: SettingsNavGroup[]
  activeId: string
  onSelect: (id: string) => void
  onClose: () => void
  searchPlaceholder: string
  closeLabel: string
  footer?: ReactNode
  children: ReactNode
}

const ACTIVE_LAYOUT_ID = "settings-nav-active"

const ActivePill = () => (
  <motion.span
    layoutId={ACTIVE_LAYOUT_ID}
    transition={{ type: "spring", stiffness: 520, damping: 40 }}
    className="bg-sidebar-accent absolute inset-0 rounded-lg"
  />
)

const backdropMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18 },
}

const panelMotion = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 10 },
  transition: { duration: 0.24, ease: [0.32, 0.72, 0, 1] as const },
}

/**
 * The shared Discord-style settings shell: a full-screen overlay (dimming the live app behind it) with
 * a grouped, searchable left rail and a scrollable right content pane. Both the Account and Admin
 * scopes render into this same shell; they supply their own header, nav groups and active pane.
 */
const SettingsModal = ({
  header,
  groups,
  activeId,
  onSelect,
  onClose,
  searchPlaceholder,
  closeLabel,
  footer,
  children,
}: SettingsModalProps) => {
  const [query, setQuery] = useState("")

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const needle = query.trim().toLowerCase()
  const visibleGroups = needle
    ? groups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.label.toLowerCase().includes(needle)),
        }))
        .filter((group) => group.items.length > 0)
    : groups

  return createPortal(
    <motion.div
      {...backdropMotion}
      onClick={onClose}
      data-tauri-drag-region
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm sm:p-10"
    >
      <motion.div
        {...panelMotion}
        onClick={(event) => event.stopPropagation()}
        className="bg-sidebar flex h-full max-h-[820px] w-full max-w-4xl overflow-hidden rounded-2xl border shadow-2xl"
      >
        <div className="flex w-56 shrink-0 flex-col gap-2 border-r p-3">
          <div data-tauri-drag-region className="px-1 pt-1 pb-2">
            {header}
          </div>
          <div className="relative">
            <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="bg-sidebar-accent/40 h-9 border-none pl-8 text-sm"
            />
          </div>
          <nav className="scrollbar-slim -mx-1 flex-1 space-y-0.5 overflow-y-auto px-1">
            {visibleGroups.map((group, index) => (
              <div key={group.label ?? index} className="pb-1">
                {group.label ? (
                  <p className="text-muted-foreground/70 px-2 pt-2 pb-1 text-[11px] font-medium tracking-wider uppercase">
                    {group.label}
                  </p>
                ) : null}
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={cn(navRowClass(item.id === activeId), "w-full")}
                  >
                    {item.id === activeId ? <ActivePill /> : null}
                    <Icon name={item.icon} className="relative size-[18px] shrink-0" />
                    <span className="relative min-w-0 flex-1 truncate text-left">{item.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
          {footer ? <div className="border-t pt-2">{footer}</div> : null}
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <Button
            variant="ghost"
            size="icon"
            aria-label={closeLabel}
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground bg-sidebar/80 absolute top-3.5 right-3.5 z-30 size-9 rounded-full backdrop-blur"
          >
            <X className="size-5" />
          </Button>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

export default SettingsModal
