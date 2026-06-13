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
} from "@polarhq/sdk/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@polarhq/ui/components/badge"
import { Button } from "@polarhq/ui/components/button"
import { Input } from "@polarhq/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@polarhq/ui/components/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@polarhq/ui/components/sheet"
import { IconX } from "@tabler/icons-react"
import Spinner from "@components/Spinner/Spinner"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation("admin")
  const [draft, setDraft] = useState(() => overrideDisplay(limit))

  const save = useMutation({
    mutationFn: () => {
      const trimmed = draft.trim()
      const value = trimmed === "" ? null : Math.round(Number(trimmed) * MB)
      return setLimitFor("user", userId, limit.key, value)
    },
    onSuccess: () => {
      toast.success(t("limitOverrideRow.overrideSaved", { label: limit.label }))
      onChanged()
    },
    onError: () => toast.error(t("limitOverrideRow.saveError")),
  })

  const clear = useMutation({
    mutationFn: () => clearLimitFor("user", userId, limit.key),
    onSuccess: () => {
      toast.success(t("limitOverrideRow.overrideRemoved"))
      setDraft("")
      onChanged()
    },
    onError: () => toast.error(t("limitOverrideRow.clearError")),
  })

  const inherited =
    limit.value == null
      ? t("limitOverrideRow.unlimited")
      : `${Math.round(Number(limit.value) / MB)} MB`

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{limit.label}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={draft}
          placeholder={t("limitOverrideRow.inheritedPlaceholder", { inherited })}
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
          {t("limitOverrideRow.save")}
        </Button>
        {limit.hasOverride ? (
          <Button size="sm" variant="ghost" disabled={clear.isPending} onClick={() => clear.mutate()}>
            {t("limitOverrideRow.reset")}
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
  const { t } = useTranslation("admin")
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
      toast.success(t("userDetailSheet.roleAssigned"))
      setRoleToAdd("")
      refresh()
    },
    onError: () => toast.error(t("userDetailSheet.assignError")),
  })

  const unassign = useMutation({
    mutationFn: (roleId: string) => unassignRole(userId as string, roleId),
    onSuccess: () => {
      toast.success(t("userDetailSheet.roleRemoved"))
      refresh()
    },
    onError: () => toast.error(t("userDetailSheet.unassignError")),
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
              <h3 className="text-xs font-semibold tracking-wide uppercase">
                {t("userDetailSheet.roles")}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {detail.roles.length > 0 ? (
                  detail.roles.map((role) => (
                    <Badge key={role.id} variant="secondary" className="gap-1 pe-1">
                      {role.name}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("userDetailSheet.removeRole", { name: role.name })}
                        className="size-4"
                        onClick={() => unassign.mutate(role.id)}
                      >
                        <IconX className="size-3" />
                      </Button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {t("userDetailSheet.noRoles")}
                  </span>
                )}
              </div>
              {assignable.length > 0 ? (
                <div className="mt-1 flex items-center gap-2">
                  <Select value={roleToAdd} onValueChange={(value) => setRoleToAdd(value ?? "")}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t("userDetailSheet.assignRolePlaceholder")} />
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
                    {t("userDetailSheet.assign")}
                  </Button>
                </div>
              ) : null}
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold tracking-wide uppercase">
                {t("userDetailSheet.groups")}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {detail.groups.length > 0 ? (
                  detail.groups.map((group) => (
                    <Badge key={group.id} variant="outline">
                      {group.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">
                    {t("userDetailSheet.noGroups")}
                  </span>
                )}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-xs font-semibold tracking-wide uppercase">
                {t("userDetailSheet.limitOverrides")}
              </h3>
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
