import { type ReactNode, useEffect, useRef } from "react"
import { useNavigation } from "@workspace/screens/platform"
import { useTheme } from "@components/theme-provider"
import { authClient } from "@workspace/core/authClient"
import { lockKeys } from "@workspace/core/e2e"
import { useTranslation } from "react-i18next"
import {
  ClockCounterClockwise,
  FileText,
  FolderSimple,
  Gear,
  Image,
  MapPin,
  MoonStars,
  PenNib,
  ShieldCheck,
  SignOut,
  Star,
  Table,
  Trash,
} from "@phosphor-icons/react"

export type CommandGroupId = "navigate" | "actions"

/**
 * A keyboard shortcut. `keys` is the lowercased sequence to press in order (e.g. `["g","p"]` for the
 * GitHub-style "go to" chords); `label` is its display form (e.g. `"G P"`).
 */
export interface Shortcut {
  keys: string[]
  label: string
}

/** One entry in the command palette. `keywords` are extra search terms not shown in the label. */
export interface AppCommand {
  id: string
  group: CommandGroupId
  title: string
  keywords?: string
  icon: ReactNode
  shortcut?: Shortcut
  run: () => void
}

const chord = (second: string): Shortcut => ({ keys: ["g", second], label: `G ${second.toUpperCase()}` })

/**
 * The central command registry — the single source of truth for what the ⌘K palette (and, later,
 * bound shortcuts) can do. `close` is called before each command runs so the palette dismisses.
 */
export const useCommands = (close: () => void): AppCommand[] => {
  const router = useNavigation()
  const { resolvedTheme, setTheme } = useTheme()
  const { t } = useTranslation("common")

  const go = (href: string) => () => {
    close()
    router.push(href)
  }
  const run = (fn: () => void) => () => {
    close()
    fn()
  }

  const photos = t("apps.photos")
  const drive = t("apps.drive")

  return [
    { id: "nav-photos", group: "navigate", title: photos, icon: <Image />, shortcut: chord("p"), run: go("/photos") },
    { id: "nav-drive", group: "navigate", title: drive, icon: <FolderSimple />, shortcut: chord("d"), run: go("/drive") },
    { id: "nav-docs", group: "navigate", title: t("apps.docs"), icon: <FileText />, shortcut: chord("o"), run: go("/docs") },
    { id: "nav-sheets", group: "navigate", title: t("apps.sheets"), icon: <Table />, shortcut: chord("s"), run: go("/sheets") },
    {
      id: "nav-whiteboards",
      group: "navigate",
      title: t("apps.whiteboard"),
      icon: <PenNib />,
      shortcut: chord("w"),
      run: go("/whiteboards"),
    },
    {
      id: "nav-photos-favourites",
      group: "navigate",
      title: `${photos}: ${t("commandPalette.favourites")}`,
      keywords: "photos favourites favorites",
      icon: <Star />,
      run: go("/photos/favourites"),
    },
    {
      id: "nav-photos-albums",
      group: "navigate",
      title: `${photos}: ${t("commandPalette.albums")}`,
      keywords: "photos albums",
      icon: <Image />,
      run: go("/photos/albums"),
    },
    {
      id: "nav-photos-map",
      group: "navigate",
      title: `${photos}: ${t("commandPalette.map")}`,
      keywords: "photos map location",
      icon: <MapPin />,
      run: go("/photos/map"),
    },
    {
      id: "nav-drive-recent",
      group: "navigate",
      title: `${drive}: ${t("commandPalette.recent")}`,
      keywords: "drive recent",
      icon: <ClockCounterClockwise />,
      run: go("/drive/recent"),
    },
    {
      id: "nav-drive-trash",
      group: "navigate",
      title: `${drive}: ${t("commandPalette.trash")}`,
      keywords: "drive trash bin deleted",
      icon: <Trash />,
      run: go("/drive/trash"),
    },
    {
      id: "nav-account",
      group: "navigate",
      title: t("flatSidebar.account"),
      keywords: "settings preferences profile",
      icon: <Gear />,
      shortcut: chord("a"),
      run: go("/account"),
    },
    {
      id: "nav-admin",
      group: "navigate",
      title: t("apps.admin"),
      keywords: "admin console users",
      icon: <ShieldCheck />,
      run: go("/admin"),
    },
    {
      id: "act-theme",
      group: "actions",
      title: t("commandPalette.toggleTheme"),
      keywords: "dark light mode appearance",
      icon: <MoonStars />,
      run: run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark")),
    },
    {
      id: "act-signout",
      group: "actions",
      title: t("actions.signOut"),
      keywords: "log out logout",
      icon: <SignOut />,
      run: run(() => {
        lockKeys()
        void authClient.signOut().finally(() => router.replace("/sign-in"))
      }),
    },
  ]
}

/** How long after the first key of a chord we wait for the second, in ms. */
const SEQUENCE_TIMEOUT = 1200

/**
 * Bind the registry's shortcuts globally. Supports GitHub-style two-key chords — press `g`, then the
 * second key within {@link SEQUENCE_TIMEOUT}. Never fires while a modifier is held, while typing in a
 * field, or while any dialog/palette is open, so it won't fight in-screen handlers.
 */
export const useShortcuts = (commands: AppCommand[]): void => {
  const commandsRef = useRef(commands)
  commandsRef.current = commands
  const pendingRef = useRef<{ key: string; at: number } | null>(null)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const el = event.target as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return
      if (document.querySelector('[data-slot="dialog-content"]')) return

      const key = event.key.toLowerCase()
      const all = commandsRef.current
      const pending = pendingRef.current

      if (pending && Date.now() - pending.at < SEQUENCE_TIMEOUT) {
        pendingRef.current = null
        const match = all.find(
          (c) =>
            !!c.shortcut &&
            c.shortcut.keys.length === 2 &&
            c.shortcut.keys[0] === pending.key &&
            c.shortcut.keys[1] === key,
        )
        if (match) {
          event.preventDefault()
          match.run()
          return
        }
      }

      if (all.some((c) => !!c.shortcut && c.shortcut.keys.length === 2 && c.shortcut.keys[0] === key)) {
        pendingRef.current = { key, at: Date.now() }
        return
      }

      const single = all.find(
        (c) => !!c.shortcut && c.shortcut.keys.length === 1 && c.shortcut.keys[0] === key,
      )
      if (single) {
        event.preventDefault()
        single.run()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
}
