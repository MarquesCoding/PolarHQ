"use client"

import { IconCheck, IconPlus, IconSelector } from "@tabler/icons-react"
import { Icon } from "@workspace/ui/components/icon"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"

interface WorkspaceSwitcherProps {
  appName: string
  productName: string
  icon: string
  collapsed: boolean
  beta?: boolean
}

const WorkspaceSwitcher = ({
  appName,
  productName,
  icon,
  collapsed,
  beta,
}: WorkspaceSwitcherProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <button
          type="button"
          aria-label="Switch workgroup"
          className={cn(
            "hover:bg-sidebar-accent/60 flex items-center gap-2 rounded-lg p-1.5 transition",
            collapsed && "justify-center",
          )}
        >
          <span className="bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Icon name={icon} className="size-5" />
          </span>
          {!collapsed ? (
            <>
              <span className="flex min-w-0 flex-col text-left leading-tight">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{appName}</span>
                  {beta ? (
                    <span className="bg-primary/15 text-primary rounded px-1 py-px text-[9px] font-semibold tracking-wide uppercase">
                      Beta
                    </span>
                  ) : null}
                </span>
                <span className="text-muted-foreground truncate text-xs">{productName}</span>
              </span>
              <IconSelector className="text-muted-foreground ml-auto size-4 shrink-0" />
            </>
          ) : null}
        </button>
      }
    />
    <DropdownMenuContent align="start" sideOffset={6} className="w-60">
      <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium">Workgroups</p>
      <DropdownMenuItem className="gap-2">
        <span className="bg-foreground text-background flex size-6 shrink-0 items-center justify-center rounded-md">
          <Icon name={icon} className="size-4" />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium">{appName}</span>
          <span className="text-muted-foreground truncate text-xs">Personal</span>
        </span>
        <IconCheck className="text-primary ml-auto size-4 shrink-0" />
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem disabled className="gap-2">
        <span className="border-border text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-md border border-dashed">
          <IconPlus className="size-4" />
        </span>
        <span className="text-sm">Create or join — soon</span>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

export default WorkspaceSwitcher
