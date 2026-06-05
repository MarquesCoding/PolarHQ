"use client"

import type { ComponentType, DragEvent } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { fetchApps } from "@lib/apps"
import { authClient } from "@lib/authClient"
import { Icon } from "@lib/icons"
import { SPLIT_APP_MIME } from "@lib/splitView"
import { useTheme } from "next-themes"
import {
  IconBolt,
  IconHelp,
  IconLogout,
  IconMoon,
  IconSun,
} from "@tabler/icons-react"
import { useQuery } from "@tanstack/react-query"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"
import { cn } from "@workspace/ui/lib/utils"

type IconComponent = ComponentType<{ className?: string }>

const RailButton = ({
  label,
  active,
  disabled,
  onClick,
  draggable,
  onDragStart,
  icon: IconComp,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  draggable?: boolean
  onDragStart?: (event: DragEvent) => void
  icon: IconComponent
}) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
          draggable={draggable}
          onDragStart={onDragStart}
          className={cn(
            "size-9 rounded-lg",
            active && "bg-accent text-accent-foreground",
            disabled && "opacity-40",
            draggable && "cursor-grab active:cursor-grabbing",
          )}
        >
          <IconComp className="size-5" />
        </Button>
      }
    />
    <TooltipContent side="right">{label}</TooltipContent>
  </Tooltip>
)

const GlobalActionBar = () => {
  const router = useRouter()
  const pathname = usePathname()
  const { data: apps } = useQuery({ queryKey: ["apps"], queryFn: fetchApps })
  const { data: session } = authClient.useSession()
  const { resolvedTheme, setTheme } = useTheme()

  const signOut = async () => {
    await authClient.signOut()
    router.replace("/sign-in")
  }

  return (
    <aside className="panel flex w-14 shrink-0 flex-col items-center gap-1 rounded-xl py-3">
      <Link
        href="/"
        aria-label="Home"
        className="bg-primary text-primary-foreground mb-2 flex size-9 items-center justify-center rounded-lg"
      >
        <IconBolt className="size-5" />
      </Link>

      <nav className="flex flex-col items-center gap-1">
        {(apps ?? []).map((app) => {
          const active = app.route !== "/" && pathname.startsWith(app.route)
          return (
            <RailButton
              key={app.id}
              label={app.available ? app.name : `${app.name} · soon`}
              icon={(props) => <Icon name={app.icon} className={props.className} />}
              active={active}
              disabled={!app.available}
              onClick={() => app.available && router.push(app.route)}
              draggable={app.available}
              onDragStart={(event) => {
                event.dataTransfer.setData(
                  SPLIT_APP_MIME,
                  JSON.stringify({
                    id: app.id,
                    name: app.name,
                    route: app.route,
                    icon: app.icon,
                  }),
                )
                event.dataTransfer.effectAllowed = "copy"
              }}
            />
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-1">
        <RailButton
          label={resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          icon={resolvedTheme === "dark" ? IconSun : IconMoon}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        />
        <RailButton label="Help" icon={IconHelp} />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Account" className="size-9 rounded-full">
                <Avatar className="size-7">
                  <AvatarImage
                    src={`https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${encodeURIComponent(
                      session?.user?.email ?? session?.user?.name ?? "user",
                    )}`}
                    alt={session?.user?.name ?? "Account"}
                  />
                  <AvatarFallback className="text-xs">
                    {(session?.user?.name ?? "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent side="right" align="end" className="w-48">
            <div className="px-2 py-1.5 text-sm">
              <p className="truncate font-medium">{session?.user?.name}</p>
              <p className="text-muted-foreground truncate text-xs">{session?.user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <IconLogout className="size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}

export default GlobalActionBar
