import type { ReactNode } from "react"
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

/** One entry in the command palette. `keywords` are extra search terms not shown in the label. */
export interface AppCommand {
  id: string
  group: CommandGroupId
  title: string
  keywords?: string
  icon: ReactNode
  run: () => void
}

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
    { id: "nav-photos", group: "navigate", title: photos, icon: <Image />, run: go("/photos") },
    { id: "nav-drive", group: "navigate", title: drive, icon: <FolderSimple />, run: go("/drive") },
    { id: "nav-docs", group: "navigate", title: t("apps.docs"), icon: <FileText />, run: go("/docs") },
    { id: "nav-sheets", group: "navigate", title: t("apps.sheets"), icon: <Table />, run: go("/sheets") },
    {
      id: "nav-whiteboards",
      group: "navigate",
      title: t("apps.whiteboard"),
      icon: <PenNib />,
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
