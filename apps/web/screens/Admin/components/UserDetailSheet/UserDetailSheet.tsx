"use client"

import { useState } from "react"
import {
  type UserLimit,
  assignRole,
  clearLimitFor,
  fetchAdminRoles,
  fetchAdminUser,
  setLimitFor,
  unassignRole,
} from "@lib/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@workspace/ui/components/sheet"
import { IconX } from "@tabler/icons-react"
import Spinner from "@components/Spinner/Spinner"
import { toast } from "sonner"

const MB = 1024 * 1024

const overrideDisplay = (limit: UserLimit): string =>
  limit.hasOverride && limit.override != null ? String(Math.round(Number(limit.override) / MB)) : ""

const LimitOverrideRow = ({
  userId,
  limit,
  onChanged,
}: {
  userId: string
  limit: UserLimit
  onChanged: () => void
}) => {
  const [draft, setDraft] = useState(() => overrideDisplay(limit))

  const save = useMutation({
    mutationFn: () => {
      const trimmed = draft.trim()
      const value = trimmed === "" ? null : Math.round(Number(trimmed) * MB)
      return setLimitFor("user", userId, limit.key, value)
    },
    onSuccess: () => {
      toast.success(`${limit.label} override saved`)
      onChanged()
    },
    onError: () => toast.error("Could not save the override"),
  })

  const clear = useMutation({
    mutationFn: () => clearLimitFor("user", userId, limit.key),
    onSuccess: () => {
      toast.success("Override removed")
      setDraft("")
      onChanged()
    },
    onError: () => toast.error("Could not remove the override"),
  })

  const inherited = limit.value == null ? "unlimited" : `${Math.round(Number(limit.value) / MB)} MB`

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{limit.label}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={draft}
          placeholder={`Inherited: ${inherited}`}
          onChange={(event) => setDraft(event.target.value)}
          className="w-32"
        />
        <span className="text-muted-foreground text-xs">MB</span>
        <Button
          size="sm"
          variant="secondary"
          disabled={save.isPending || draft === overrideDisplay(limit)}
          onClick={() => save.mutate()}
        >
          Save
        </Button>
        {limit.hasOverride ? (
          <Button size="sm" variant="ghost" disabled={clear.isPending} onClick={() => clear.mutate()}>
            Reset
          </Button>
        ) : null}
      </div>
    </div>
  )
}

interface UserDetailSheetProps {
  userId: string | null
  onOpenChange: (open: boolean) => void
}

const UserDetailSheet = ({ userId, onOpenChange }: UserDetailSheetProps) => {
  const queryClient = useQueryClient()
  const open = userId != null

  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => fetchAdminUser(userId as string),
    enabled: open,
  })
  const { data: roles } = useQuery({ queryKey: ["admin", "roles"], queryFn: fetchAdminRoles })

  const [roleToAdd, setRoleToAdd] = useState("")

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] })
    void queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] })
  }

  const assign = useMutation({
    mutationFn: () => assignRole(userId as string, roleToAdd),
    onSuccess: () => {
      toast.success("Role assigned")
      setRoleToAdd("")
      refresh()
    },
    onError: () => toast.error("Could not assign the role"),
  })

  const unassign = useMutation({
    mutationFn: (roleId: string) => unassignRole(userId as string, roleId),
    onSuccess: () => {
      toast.success("Role removed")
      refresh()
    },
    onError: () => toast.error("Could not remove the role"),
  })

  const assignedIds = new Set((detail?.roles ?? []).map((role) => role.id))
  const assignable = (roles ?? []).filter((role) => !assignedIds.has(role.id))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        {isLoading || !detail ? (
          <div className="flex flex-1 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <div className="scrollbar-slim flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            <SheetHeader className="p-0">
              <SheetTitle>{detail.name}</SheetTitle>
              <span className="text-muted-foreground text-sm">{detail.email}</span>
            </SheetHeader>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide uppercase">Roles</h3>
              <div className="flex flex-wrap gap-1.5">
                {detail.roles.length > 0 ? (
                  detail.roles.map((role) => (
                    <Badge key={role.id} variant="secondary" className="gap-1 pe-1">
                      {role.name}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove ${role.name}`}
                        className="size-4"
                        onClick={() => unassign.mutate(role.id)}
                      >
                        <IconX className="size-3" />
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">No roles assigned.</span>
                )}
              </div>
              {assignable.length > 0 ? (
                <div className="mt-1 flex items-center gap-2">
                  <Select value={roleToAdd} onValueChange={(value) => setRoleToAdd(value ?? "")}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Assign a role…" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignable.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!roleToAdd || assign.isPending}
                    onClick={() => assign.mutate()}
                  >
                    Assign
                  </Button>
                </div>
              ) : null}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide uppercase">Groups</h3>
              <div className="flex flex-wrap gap-1.5">
                {detail.groups.length > 0 ? (
                  detail.groups.map((group) => (
                    <Badge key={group.id} variant="outline">
                      {group.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">Not in any group.</span>
                )}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-xs font-semibold tracking-wide uppercase">Limit overrides</h3>
              {detail.limits.map((limit) => (
                <LimitOverrideRow
                  key={limit.key}
                  userId={detail.id}
                  limit={limit}
                  onChanged={refresh}
                />
              ))}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

export default UserDetailSheet
