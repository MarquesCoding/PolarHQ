import { type ReactElement, useEffect, useMemo, useState } from "react"
import {
  type AdminPermission,
  type AdminRole,
  createAdminRole,
  deleteAdminRole,
  fetchAdminPermissions,
  fetchAdminRole,
  fetchAdminRoles,
  updateAdminRole,
} from "@workspace/core/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
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

interface RoleDialogProps {
  /** The role being edited, or null/undefined for create mode. */
  role?: AdminRole | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  /** Create mode renders its own trigger button; edit mode is opened by the parent. */
  trigger?: ReactElement
}

const RoleDialog = ({ role, open, onOpenChange, onSaved, trigger }: RoleDialogProps) => {
  const { t } = useTranslation("admin")
  const isEdit = Boolean(role)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const { data: permissions } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: fetchAdminPermissions,
    enabled: open,
  })
  const groups = useMemo(() => groupPermissions(permissions ?? []), [permissions])

  const { data: detail } = useQuery({
    queryKey: ["admin", "roles", role?.id],
    queryFn: () => fetchAdminRole(role!.id),
    enabled: open && isEdit,
  })

  // Prefill from the role being edited (or reset to blank for create) whenever the dialog opens.
  useEffect(() => {
    if (!open) return
    setConfirmingDelete(false)
    if (isEdit && detail) {
      setName(detail.name)
      setDescription(detail.description ?? "")
      setSelected(new Set(detail.permissions))
    } else if (!isEdit) {
      setName("")
      setDescription("")
      setSelected(new Set())
    }
  }, [open, isEdit, detail])

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
      onOpenChange(false)
      onSaved()
    },
    onError: () =>
      toast.error(isEdit ? t("createRoleDialog.updateError") : t("createRoleDialog.createError")),
  })

  const remove = useMutation({
    mutationFn: () => deleteAdminRole(role!.id),
    onSuccess: () => {
      toast.success(t("createRoleDialog.deleted"))
      onOpenChange(false)
      onSaved()
    },
    onError: () => toast.error(t("createRoleDialog.deleteError")),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("createRoleDialog.editRole") : t("createRoleDialog.newRole")}
          </DialogTitle>
        </DialogHeader>
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
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              {t("createRoleDialog.permissions")}
              <span className="text-muted-foreground ml-1.5 font-normal">{selected.size}</span>
            </span>
            <div className="scrollbar-slim border-border/60 flex max-h-72 flex-col gap-4 overflow-y-auto rounded-lg border p-3">
              {groups.map((group) => {
                const keys = group.permissions.map((permission) => permission.key)
                const allOn = keys.every((key) => selected.has(key))
                const someOn = keys.some((key) => selected.has(key))
                return (
                  <div key={group.app} className="flex flex-col gap-1.5">
                    <Label className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                      <Checkbox
                        checked={allOn}
                        indeterminate={!allOn && someOn}
                        onCheckedChange={(on) => toggleGroup(keys, on === true)}
                      />
                      {group.app}
                    </Label>
                    <div className="ml-6 flex flex-col gap-1.5">
                      {group.permissions.map((permission) => (
                        <Label
                          key={permission.key}
                          className="flex items-start gap-2 text-sm font-normal"
                        >
                          <Checkbox
                            checked={selected.has(permission.key)}
                            onCheckedChange={(on) => toggle(permission.key, on === true)}
                            className="mt-0.5"
                          />
                          <span className="flex min-w-0 flex-col">
                            <span>{permission.description}</span>
                            <span className="text-muted-foreground font-mono text-xs">
                              {permission.key}
                            </span>
                          </span>
                        </Label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
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
          <DialogClose render={<Button variant="ghost">{t("createRoleDialog.cancel")}</Button>} />
          <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
            {isEdit ? t("createRoleDialog.saveChanges") : t("createRoleDialog.createRole")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const Roles = () => {
  const { t } = useTranslation("admin")
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<AdminRole | null>(null)
  const { data: roles, isLoading } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: fetchAdminRoles,
  })
  const onSaved = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "roles"] })
    void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] })
  }

  const roleRow = (role: AdminRole) => (
    <div key={role.id} className="flex items-center gap-3 px-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2 text-sm font-medium">
          {role.name}
          {role.isSystem ? <Badge variant="secondary">{t("roles.system")}</Badge> : null}
        </span>
        {role.description ? (
          <span className="text-muted-foreground truncate text-xs">{role.description}</span>
        ) : null}
      </div>
      {!role.isSystem ? (
        <Button variant="ghost" size="sm" onClick={() => setEditing(role)}>
          {t("roles.edit")}
        </Button>
      ) : null}
    </div>
  )

  return (
    <AdminPage
      title={t("roles.title")}
      description={t("roles.description")}
      action={
        <RoleDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSaved={onSaved}
          trigger={<Button>{t("createRoleDialog.newRole")}</Button>}
        />
      }
    >
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="panel divide-border/60 divide-y overflow-hidden rounded-xl">
          {(roles ?? []).map(roleRow)}
        </div>
      )}
      <RoleDialog
        role={editing}
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={onSaved}
      />
    </AdminPage>
  )
}

export default Roles
