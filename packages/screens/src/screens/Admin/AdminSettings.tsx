import { type ReactNode } from "react"
import { Icon } from "@workspace/screens/icons"
import { useAppDispatch, useAppSelector } from "@workspace/screens/store/hooks"
import { closeSettings, setSettingsSection } from "@workspace/screens/store/uiSlice"
import SettingsModal, { type SettingsNavGroup } from "@components/SettingsModal/SettingsModal"
import Overview from "@pages/Admin/Overview"
import Users from "@pages/Admin/Users"
import Groups from "@pages/Admin/Groups"
import Roles from "@pages/Admin/Roles"
import Apps from "@pages/Admin/Apps"
import Limits from "@pages/Admin/Limits"
import Branding from "@pages/Admin/Branding"
import Backup from "@pages/Admin/Backup"
import Settings from "@pages/Admin/Settings"
import Audit from "@pages/Admin/Audit"
import { useTranslation } from "react-i18next"

/** The Admin scope of the settings modal — the ten console screens rendered as panes. */
const AdminSettings = () => {
  const { t } = useTranslation("admin")
  const dispatch = useAppDispatch()
  const section = useAppSelector((state) => state.ui.settingsSection) ?? "overview"

  const groups: SettingsNavGroup[] = [
    {
      label: t("adminNav.groupInstance"),
      items: [
        { id: "overview", label: t("adminNav.overview"), icon: "gauge" },
        { id: "settings", label: t("adminNav.settings"), icon: "settings" },
        { id: "branding", label: t("adminNav.branding"), icon: "palette" },
        { id: "backup", label: t("adminNav.backup"), icon: "database" },
      ],
    },
    {
      label: t("adminNav.groupPeople"),
      items: [
        { id: "users", label: t("adminNav.users"), icon: "users" },
        { id: "groups", label: t("adminNav.groups"), icon: "users-group" },
        { id: "roles", label: t("adminNav.roles"), icon: "user-shield" },
      ],
    },
    {
      label: t("adminNav.groupAppsLimits"),
      items: [
        { id: "apps", label: t("adminNav.apps"), icon: "apps" },
        { id: "limits", label: t("adminNav.limits"), icon: "sliders" },
      ],
    },
    {
      label: t("adminNav.groupActivity"),
      items: [{ id: "audit", label: t("adminNav.auditLog"), icon: "list" }],
    },
  ]

  const panes: Record<string, ReactNode> = {
    overview: <Overview />,
    settings: <Settings />,
    branding: <Branding />,
    backup: <Backup />,
    users: <Users />,
    groups: <Groups />,
    roles: <Roles />,
    apps: <Apps />,
    limits: <Limits />,
    audit: <Audit />,
  }

  const header = (
    <div className="flex items-center gap-2.5">
      <div className="bg-sidebar-accent text-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon name="shield-lock" className="size-5" />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold">{t("consoleTitle")}</span>
        <span className="text-muted-foreground truncate text-xs">{t("adminNav.console")}</span>
      </div>
    </div>
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
    >
      {panes[section] ?? panes.overview}
    </SettingsModal>
  )
}

export default AdminSettings
