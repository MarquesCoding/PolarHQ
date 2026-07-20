import { type ReactNode } from "react"
import { useNavigation } from "@workspace/screens/platform"
import { authClient } from "@workspace/core/authClient"
import { setAuthToken } from "@workspace/core/authToken"
import { lockKeys } from "@workspace/core/e2e"
import { getHost } from "@workspace/core/host"
import { useAppDispatch, useAppSelector } from "@workspace/screens/store/hooks"
import { closeSettings, setSettingsSection } from "@workspace/screens/store/uiSlice"
import DeviceList from "@components/DevicesDialog/DeviceList"
import LanguageSelector from "@components/LanguageSelector/LanguageSelector"
import MigrateGoogle from "@pages/Account/MigrateGoogle"
import SyncedFolders from "@pages/Account/SyncedFolders"
import SettingsModal, {
  type SettingsNavGroup,
} from "@components/SettingsModal/SettingsModal"
import { Pane, PaneSection, Row } from "@components/SettingsModal/pane"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { type Accent, ACCENTS, useTheme } from "@components/theme-provider"
import { Check, SignOut } from "@phosphor-icons/react"
import { useTranslation } from "react-i18next"

const ACCENT_SWATCH: Record<Accent, string> = {
  violet: "#7c5cfc",
  blue: "#3b6cf6",
  emerald: "#059669",
  rose: "#e11d48",
  amber: "#f59e0b",
}

const avatarUrl = (seed: string) =>
  `https://api.dicebear.com/10.x/notionists-neutral/svg?seed=${encodeURIComponent(seed)}`

const ProfilePane = ({ name, email }: { name: string; email: string }) => {
  const { t } = useTranslation("account")
  return (
    <Pane title={t("nav.profile")}>
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={avatarUrl(email || name || "user")} alt={name} />
          <AvatarFallback>{(name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="text-lg font-semibold">{name}</span>
          <span className="text-muted-foreground text-sm">{email}</span>
        </div>
      </div>
      <PaneSection title={t("profile")}>
        <Row label={t("name")}>
          <span className="text-muted-foreground text-sm">{name}</span>
        </Row>
        <Row label={t("email")}>
          <span className="text-muted-foreground text-sm">{email}</span>
        </Row>
      </PaneSection>
    </Pane>
  )
}

const AppearancePane = () => {
  const { t } = useTranslation("account")
  const { theme, setTheme, accent, setAccent } = useTheme()
  const themes = [
    { value: "light", label: t("light") },
    { value: "dark", label: t("dark") },
    { value: "system", label: t("system") },
  ] as const
  return (
    <Pane title={t("nav.appearance")}>
      <PaneSection>
        <Row label={t("appearance")} hint={t("appearanceHint")}>
          <div className="bg-sidebar-accent/50 flex items-center gap-0.5 rounded-lg p-0.5">
            {themes.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition",
                  theme === option.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </Row>
        <Row
          label={t("accent", { defaultValue: "Accent" })}
          hint={t("accentHint", { defaultValue: "The app's highlight colour." })}
        >
          <div className="flex items-center gap-1.5">
            {ACCENTS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={option}
                onClick={() => setAccent(option)}
                style={{ backgroundColor: ACCENT_SWATCH[option] }}
                className={cn(
                  "ring-offset-background flex size-6 items-center justify-center rounded-full ring-offset-2 transition",
                  accent === option ? "ring-foreground ring-2" : "hover:scale-110",
                )}
              >
                {accent === option ? (
                  <Check weight="bold" className="size-3.5 text-white" />
                ) : null}
              </button>
            ))}
          </div>
        </Row>
        <Row label={t("language")} hint={t("languageHint")}>
          <LanguageSelector />
        </Row>
      </PaneSection>
    </Pane>
  )
}

const DevicesPane = () => {
  const { t } = useTranslation("account")
  return (
    <Pane title={t("nav.devices")}>
      <PaneSection title={t("security")}>
        <div className="-mx-2 pt-1">
          <DeviceList />
        </div>
      </PaneSection>
    </Pane>
  )
}

const ImportPane = () => {
  const { t } = useTranslation("account")
  return (
    <Pane title={t("nav.import")}>
      <MigrateGoogle />
    </Pane>
  )
}

const SyncPane = () => {
  const { t } = useTranslation("account")
  return (
    <Pane title={t("nav.sync")}>
      <SyncedFolders />
    </Pane>
  )
}

/** The Account scope of the settings modal — profile, appearance, devices, import + synced folders. */
const AccountSettings = () => {
  const { t } = useTranslation("account")
  const router = useNavigation()
  const dispatch = useAppDispatch()
  const section = useAppSelector((state) => state.ui.settingsSection) ?? "profile"
  const { data: session } = authClient.useSession()
  const user = session?.user
  const desktop = getHost().isDesktop

  const groups: SettingsNavGroup[] = [
    {
      label: t("groupUser"),
      items: [
        { id: "profile", label: t("nav.profile"), icon: "user" },
        { id: "appearance", label: t("nav.appearance"), icon: "palette" },
        { id: "devices", label: t("nav.devices"), icon: "key" },
      ],
    },
    {
      label: t("groupData"),
      items: [
        { id: "import", label: t("nav.import"), icon: "download" },
        ...(desktop ? [{ id: "sync", label: t("nav.sync"), icon: "folder" }] : []),
      ],
    },
  ]

  const name = user?.name ?? ""
  const email = user?.email ?? ""

  const panes: Record<string, ReactNode> = {
    profile: <ProfilePane name={name} email={email} />,
    appearance: <AppearancePane />,
    devices: <DevicesPane />,
    import: <ImportPane />,
    sync: <SyncPane />,
  }

  const signOut = async () => {
    lockKeys()
    await authClient.signOut()
    setAuthToken(null)
    dispatch(closeSettings())
    router.replace("/sign-in")
  }

  const header = (
    <div className="flex items-center gap-2.5">
      <Avatar className="size-9">
        <AvatarImage src={avatarUrl(email || name || "user")} alt={name} />
        <AvatarFallback>{(name || "U").slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{name}</span>
        <span className="text-muted-foreground truncate text-xs">{email}</span>
      </div>
    </div>
  )

  const footer = (
    <Button
      variant="ghost"
      onClick={signOut}
      className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start gap-2.5 px-2.5"
    >
      <SignOut className="size-[18px]" />
      {t("signOut", { defaultValue: "Sign out" })}
    </Button>
  )

  return (
    <SettingsModal
      header={header}
      groups={groups}
      activeId={section}
      onSelect={(id) => dispatch(setSettingsSection(id))}
      onClose={() => dispatch(closeSettings())}
      searchPlaceholder={t("searchSettings")}
      closeLabel={t("close")}
      footer={footer}
    >
      {panes[section] ?? panes.profile}
    </SettingsModal>
  )
}

export default AccountSettings
