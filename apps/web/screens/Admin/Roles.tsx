"use client"

import { useMemo, useState } from "react"
import {
  type AdminPermission,
  type AdminRole,
  createAdminRole,
  fetchAdminPermissions,
  fetchAdminRoles,
} from "@lib/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@polarhq/ui/components/badge"
import { Button } from "@polarhq/ui/components/button"
import { Checkbox } from "@polarhq/ui/components/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@polarhq/ui/components/dialog"
import { Input } from "@polarhq/ui/components/input"
import { Label } from "@polarhq/ui/components/label"
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

const CreateRoleDialog = ({ onCreated }: { onCreated: () => void }) => {
  const { t } = useTranslation("admin")
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data: permissions } = useQuery({
    queryKey: ["admin", "permissions"],
    queryFn: fetchAdminPermissions,
    enabled: open,
  })
  const groups = useMemo(() => groupPermissions(permissions ?? []), [permissions])

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

  const create = useMutation({
    mutationFn: () => createAdminRole(name.trim(), description.trim(), [...selected]),
    onSuccess: () => {
      toast.success(t("createRoleDialog.created"))
      setName("")
      setDescription("")
      setSelected(new Set())
      setOpen(false)
      onCreated()
    },
    onError: () => toast.error(t("createRoleDialog.createError")),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>{t("createRoleDialog.newRole")}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createRoleDialog.newRole")}</DialogTitle>
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
          <DialogClose render={<Button variant="ghost">{t("createRoleDialog.cancel")}</Button>} />
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            {t("createRoleDialog.createRole")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const Roles = () => {
  const { t } = useTranslation("admin")
  const queryClient = useQueryClient()
  const { data: roles, isLoading } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: fetchAdminRoles,
  })
  const onCreated = () => {
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
    </div>
  )

  return (
    <AdminPage
      title={t("roles.title")}
      description={t("roles.description")}
      action={<CreateRoleDialog onCreated={onCreated} />}
    >
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="panel divide-border/60 divide-y overflow-hidden rounded-xl">
          {(roles ?? []).map(roleRow)}
        </div>
      )}
    </AdminPage>
  )
}

export default Roles
