import { useState } from "react"
import {
  type AdminUser,
  createAdminUser,
  fetchAdminUsers,
  setUserBanned,
  setUserRole,
} from "@workspace/core/admin"
import UserEditor from "@pages/Admin/components/UserEditor/UserEditor"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { DotsThreeVertical } from "@phosphor-icons/react"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { initials } from "@pages/Admin/lib/initials"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const CreateUserDialog = ({ onCreated }: { onCreated: () => void }) => {
  const { t } = useTranslation("admin")
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [makeAdmin, setMakeAdmin] = useState(false)

  const create = useMutation({
    mutationFn: () =>
      createAdminUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role: makeAdmin ? "admin" : "user",
      }),
    onSuccess: () => {
      toast.success(t("createUserDialog.created"))
      setName("")
      setEmail("")
      setPassword("")
      setMakeAdmin(false)
      setOpen(false)
      onCreated()
    },
    onError: () => toast.error(t("createUserDialog.createError")),
  })

  const valid = name.trim() && /.+@.+\..+/.test(email.trim()) && password.length >= 8

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>{t("createUserDialog.newUser")}</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createUserDialog.title")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-name">{t("createUserDialog.name")}</Label>
            <Input
              id="new-user-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-email">{t("createUserDialog.email")}</Label>
            <Input
              id="new-user-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-user-password">{t("createUserDialog.password")}</Label>
            <Input
              id="new-user-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <span className="text-muted-foreground text-xs">
              {t("createUserDialog.passwordHint")}
            </span>
          </div>
          <Label className="flex items-center gap-2 text-sm font-normal">
            <Checkbox checked={makeAdmin} onCheckedChange={(on) => setMakeAdmin(on === true)} />
            {t("createUserDialog.makeAdmin")}
          </Label>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">{t("createUserDialog.cancel")}</Button>} />
          <Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>
            {t("createUserDialog.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const isAdmin = (role: string | null): boolean => role === "admin" || role === "owner"

const Users = () => {
  const { t } = useTranslation("admin")
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<string | null>(null)
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: fetchAdminUsers,
  })

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] })
  }

  const ban = useMutation({
    mutationFn: ({ id, banned }: { id: string; banned: boolean }) => setUserBanned(id, banned),
    onSuccess: (_data, variables) => {
      toast.success(variables.banned ? t("users.userBanned") : t("users.userUnbanned"))
      refresh()
    },
    onError: () => toast.error(t("users.couldNotUpdateUser")),
  })

  const role = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string | null }) => setUserRole(id, value),
    onSuccess: () => {
      toast.success(t("users.roleUpdated"))
      refresh()
    },
    onError: () => toast.error(t("users.couldNotUpdateRole")),
  })

  const row = (user: AdminUser) => (
    <div
      key={user.id}
      className="border-border/60 flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
    >
      <Avatar size="sm">
        <AvatarFallback>{initials(user.name)}</AvatarFallback>
      </Avatar>
      <Button
        variant="ghost"
        onClick={() => setSelected(user.id)}
        className="-mx-1 h-auto min-w-0 flex-1 flex-col items-start gap-0 px-1 py-1 font-normal"
      >
        <span className="w-full truncate text-sm font-medium">{user.name}</span>
        <span className="text-muted-foreground w-full truncate text-xs">{user.email}</span>
      </Button>
      {isAdmin(user.role) ? <Badge variant="secondary">{t("users.admin")}</Badge> : null}
      {user.banned ? <Badge variant="destructive">{t("users.banned")}</Badge> : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={t("users.userActions")}>
              <DotsThreeVertical className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {isAdmin(user.role) ? (
            <DropdownMenuItem onClick={() => role.mutate({ id: user.id, value: "user" })}>
              {t("users.removeAdmin")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => role.mutate({ id: user.id, value: "admin" })}>
              {t("users.makeAdmin")}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {user.banned ? (
            <DropdownMenuItem onClick={() => ban.mutate({ id: user.id, banned: false })}>
              {t("users.unban")}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => ban.mutate({ id: user.id, banned: true })}
            >
              {t("users.ban")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  if (selected) {
    return <UserEditor userId={selected} onBack={() => setSelected(null)} />
  }

  return (
    <AdminPage
      title={t("users.title")}
      description={t("users.description")}
      action={<CreateUserDialog onCreated={refresh} />}
    >
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="panel overflow-hidden rounded-xl">{(users ?? []).map(row)}</div>
      )}
    </AdminPage>
  )
}

export default Users
