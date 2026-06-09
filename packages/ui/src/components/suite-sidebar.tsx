"use client"

import {
  type ComponentType,
  type ElementType,
  Fragment,
  type ReactElement,
  type ReactNode,
} from "react"
import { Icon } from "@workspace/ui/components/icon"
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

export interface SuiteNavItem {
  key: string
  label: string
  icon: string
  href: string
  active?: boolean
}

interface SuiteSidebarProps {
  header?: ReactNode
  items: SuiteNavItem[]
  /** Override the rendering of a specific nav item (e.g. an expandable albums tree). */
  renderItem?: (item: SuiteNavItem, defaultLink: ReactElement) => ReactNode
  /** Extra sections rendered below the nav (e.g. tags). */
  children?: ReactNode
  footer?: ReactNode
  collapsed?: boolean
  /** Link element used for nav items — `next/link` in apps, plain `a` by default. */
  linkAs?: ElementType
}

/** Shared suite sidebar: workspace header slot, nav, extra sections, and a footer slot. */
const SuiteSidebar = ({
  header,
  items,
  renderItem,
  children,
  footer,
  collapsed = false,
  linkAs,
}: SuiteSidebarProps) => {
  const LinkAs = (linkAs ?? "a") as unknown as ComponentType<{
    href: string
    className?: string
    children?: ReactNode
  }>

  return (
    <aside
      className={cn(
        "panel flex shrink-0 flex-col gap-3 rounded-xl p-2 transition-[width] duration-200",
        collapsed ? "w-14" : "w-56",
      )}
    >
      {header}

      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const defaultLink = (
            <LinkAs
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition",
                item.active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/60",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon name={item.icon} className="size-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </LinkAs>
          )

          const custom = renderItem?.(item, defaultLink)
          if (custom) return <Fragment key={item.key}>{custom}</Fragment>

          if (collapsed) {
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger render={defaultLink} />
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          }

          return <Fragment key={item.key}>{defaultLink}</Fragment>
        })}
      </nav>

      {children}

      {footer}
    </aside>
  )
}

export default SuiteSidebar
