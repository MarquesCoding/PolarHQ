"use client"

import { useState } from "react"
import {
  type AdminUser,
  fetchAdminUsers,
  setUserBanned,
  setUserRole,
} from "@lib/admin"
import UserDetailSheet from "@pages/Admin/components/UserDetailSheet/UserDetailSheet"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { IconDotsVertical } from "@tabler/icons-react"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { toast } from "sonner"

const initials = (name: string): string =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

const isAdmin = (role: string | null): boolean => role === "admin" || role === "owner"

const Users = () => {
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
      toast.success(variables.banned ? "User banned" : "User unbanned")
      refresh()
    },
    onError: () => toast.error("Could not update the user"),
  })

  const role = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string | null }) => setUserRole(id, value),
    onSuccess: () => {
      toast.success("Role updated")
      refresh()
    },
    onError: () => toast.error("Could not update the role"),
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
      {isAdmin(user.role) ? <Badge variant="secondary">Admin</Badge> : null}
      {user.banned ? <Badge variant="destructive">Banned</Badge> : null}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="User actions">
              <IconDotsVertical className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          {isAdmin(user.role) ? (
            <DropdownMenuItem onClick={() => role.mutate({ id: user.id, value: "user" })}>
              Remove admin
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => role.mutate({ id: user.id, value: "admin" })}>
              Make admin
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {user.banned ? (
            <DropdownMenuItem onClick={() => ban.mutate({ id: user.id, banned: false })}>
              Unban
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => ban.mutate({ id: user.id, banned: true })}
            >
              Ban
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <AdminPage title="Users" description="Everyone with an account on this instance.">
      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="panel overflow-hidden rounded-xl">{(users ?? []).map(row)}</div>
      )}
      <UserDetailSheet userId={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </AdminPage>
  )
}

export default Users
