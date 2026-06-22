import { Fragment, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/command"
import { type CommandGroupId, useCommands } from "@components/CommandPalette/useCommands"

/** Event other UI (e.g. the top-bar button) dispatches to open the palette without sharing state. */
const OPEN_EVENT = "polarhq:command-palette"

/** Open the command palette from anywhere (used by the top-bar trigger). */
export const openCommandPalette = (): void => {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

/**
 * App-wide ⌘K / Ctrl-K command palette. Mounted once (in Providers) so it's available on every
 * screen. The command set comes from the central registry in {@link useCommands}.
 */
const CommandPalette = () => {
  const { t } = useTranslation("common")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener("keydown", onKey)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener(OPEN_EVENT, onOpen)
    }
  }, [])

  const commands = useCommands(() => setOpen(false))
  const groups: Array<{ id: CommandGroupId; label: string }> = [
    { id: "navigate", label: t("commandPalette.groupNavigate") },
    { id: "actions", label: t("commandPalette.groupActions") },
  ]

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={t("commandPalette.title")}
      description={t("commandPalette.description")}
    >
      <CommandInput placeholder={t("commandPalette.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("commandPalette.empty")}</CommandEmpty>
        {groups.map((group, index) => {
          const items = commands.filter((command) => command.group === group.id)
          if (!items.length) return null
          return (
            <Fragment key={group.id}>
              {index > 0 ? <CommandSeparator /> : null}
              <CommandGroup heading={group.label}>
                {items.map((command) => (
                  <CommandItem
                    key={command.id}
                    value={`${command.title} ${command.keywords ?? ""}`}
                    onSelect={command.run}
                  >
                    {command.icon}
                    <span>{command.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Fragment>
          )
        })}
      </CommandList>
    </CommandDialog>
  )
}

export default CommandPalette
