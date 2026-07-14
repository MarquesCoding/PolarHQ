import { useEffect, useMemo, useState } from "react"
import {
  type AdminPermission,
  type AdminRole,
  createAdminRole,
  deleteAdminRole,
  fetchAdminPermissions,
  fetchAdminRole,
  updateAdminRole,
} from "@workspace/core/admin"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { MagnifyingGlass } from "@phosphor-icons/react"
import { PageSpinner } from "@components/Spinner/Spinner"
import InlineEditor from "@pages/Admin/components/InlineEditor/InlineEditor"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const appOf = (key: string): string => key.split(".")[0] ?? "other"

interface PermissionGroup {
  app: string
  permissions: AdminPermission[]
}

const groupPermissions = (permissions: AdminPermission[]): PermissionGroup[] => {
  const map = new Map<string, AdminPermission[]>()
  for (const permission of permissions) {
    const app = appOf(permission.key)
    const list = map.get(app) ?? []
    list.push(permission)
    map.set(app, list)
  }
  return [...map.entries()]
    .map(([app, list]) => ({ app, permissions: list }))
    .sort((a, b) => a.app.localeCompare(b.app))
}

type Tab = "display" | "permissions"

interface RoleEditorProps {
  role: AdminRole | null
  onBack: () => void
  onSaved: () => void
}

/** Discord-style inline role editor: Display + Permissions tabs, all within the pane. */
const RoleEditor = ({ role, onBack, onSaved }: RoleEditorProps) => {
  const { t } = useTranslation("admin")
  const isEdit = role !== null

  const [tab, setTab] = useState<Tab>("display")
  const [name, setName] = useState(role?.name ?? "")
  const [description, setDescription] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { data: permissions } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: fetchAdminPermissions,
  })
  const groups = useMemo(() => groupPermissions(permissions ?? []), [permissions])

  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin", "roles", role?.id],
    queryFn: () => fetchAdminRole(role!.id),
    enabled: isEdit,
  })

  useEffect(() => {
    if (isEdit && detail) {
      setName(detail.name)
      setDescription(detail.description ?? "")
      setSelected(new Set(detail.permissions))
    }
  }, [isEdit, detail])

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return groups
    return groups
      .map((group) => ({
        app: group.app,
        permissions: group.permissions.filter(
          (permission) =>
            permission.key.toLowerCase().includes(needle) ||
            permission.description.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.permissions.length > 0)
  }, [groups, query])

  const toggle = (key: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })

  const toggleGroup = (keys: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const key of keys) {
        if (on) next.add(key)
        else next.delete(key)
      }
      return next
    })

  const save = useMutation({
    mutationFn: () =>
      isEdit
        ? updateAdminRole(role!.id, {
            name: name.trim(),
            description: description.trim(),
            permissions: [...selected],
          })
        : createAdminRole(name.trim(), description.trim(), [...selected]),
    onSuccess: () => {
      toast.success(isEdit ? t("createRoleDialog.updated") : t("createRoleDialog.created"))
      onSaved()
      onBack()
    },
    onError: () =>
      toast.error(isEdit ? t("createRoleDialog.updateError") : t("createRoleDialog.createError")),
  })

  const remove = useMutation({
    mutationFn: () => deleteAdminRole(role!.id),
    onSuccess: () => {
      toast.success(t("createRoleDialog.deleted"))
      onSaved()
      onBack()
    },
    onError: () => toast.error(t("createRoleDialog.deleteError")),
  })

  const loading = isEdit && (isLoading || !detail)

  const tabButton = (value: Tab, label: string) => (
    <Button
      variant={tab === value ? "secondary" : "ghost"}
      size="sm"
      onClick={() => setTab(value)}
      className="font-medium"
    >
      {label}
    </Button>
  )

  return (
    <InlineEditor onBack={onBack}>
      {loading ? (
        <PageSpinner />
      ) : (
        <div className="flex flex-col gap-6">
          <header className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">
              {isEdit ? name || role?.name : t("roleEditor.newRoleTitle")}
            </h1>
            <span className="text-muted-foreground text-sm">
              {t("roleEditor.permissionCount", { count: selected.size })}
            </span>
          </header>

          <div className="bg-muted/40 inline-flex w-fit rounded-lg p-0.5">
            {tabButton("display", t("roleEditor.tabDisplay"))}
            {tabButton("permissions", t("roleEditor.tabPermissions"))}
          </div>

          {tab === "display" ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role-name">{t("createRoleDialog.name")}</Label>
                <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="role-desc">{t("createRoleDialog.description")}</Label>
                <Input
                  id="role-desc"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <MagnifyingGlass className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={query}
                  placeholder={t("roleEditor.searchPermissions")}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-col gap-5">
                {filteredGroups.length > 0 ? (
                  filteredGroups.map((group) => {
                    const keys = group.permissions.map((permission) => permission.key)
                    const allOn = keys.every((key) => selected.has(key))
                    return (
                      <div key={group.app} className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold tracking-wide uppercase">
                            {group.app}
                          </span>
                          <Switch
                            checked={allOn}
                            onCheckedChange={(on) => toggleGroup(keys, on)}
                            aria-label={t("roleEditor.toggleAll", { app: group.app })}
                          />
                        </div>
                        <div className="panel divide-border/60 flex flex-col divide-y overflow-hidden rounded-xl">
                          {group.permissions.map((permission) => (
                            <Label
                              key={permission.key}
                              className="flex items-start gap-3 px-3 py-2.5 font-normal"
                            >
                              <span className="flex min-w-0 flex-1 flex-col">
                                <span className="text-sm font-medium">{permission.description}</span>
                                <span className="text-muted-foreground font-mono text-xs">
                                  {permission.key}
                                </span>
                              </span>
                              <Switch
                                checked={selected.has(permission.key)}
                                onCheckedChange={(on) => toggle(permission.key, on)}
                                className="mt-0.5"
                              />
                            </Label>
                          ))}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-muted-foreground text-sm">{t("roleEditor.noPermissions")}</p>
                )}
              </div>
            </div>
          )}

          <div className="border-border/60 mt-2 flex items-center gap-2 border-t pt-4">
            {isEdit ? (
              confirmingDelete ? (
                <div className="mr-auto flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">
                    {t("createRoleDialog.deleteConfirm")}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate()}
                  >
                    {t("createRoleDialog.delete")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                    {t("createRoleDialog.cancel")}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive mr-auto"
                  onClick={() => setConfirmingDelete(true)}
                >
                  {t("createRoleDialog.delete")}
                </Button>
              )
            ) : null}
            {role?.isSystem ? (
              <Badge variant="secondary" className="mr-auto">
                {t("roles.system")}
              </Badge>
            ) : null}
            <Button variant="ghost" onClick={onBack}>
              {t("createRoleDialog.cancel")}
            </Button>
            <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
              {isEdit ? t("createRoleDialog.saveChanges") : t("createRoleDialog.createRole")}
            </Button>
          </div>
        </div>
      )}
    </InlineEditor>
  )
}

export default RoleEditor
