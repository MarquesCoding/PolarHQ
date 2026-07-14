import { useState } from "react"
import { assignRole, fetchAdminRoles, fetchAdminUser, unassignRole } from "@workspace/core/admin"
import { formatBytes } from "@workspace/core/format"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { X } from "@phosphor-icons/react"
import { PageSpinner } from "@components/Spinner/Spinner"
import InlineEditor from "@pages/Admin/components/InlineEditor/InlineEditor"
import LimitOverrideRow from "@pages/Admin/components/LimitOverrideRow/LimitOverrideRow"
import { initials } from "@pages/Admin/lib/initials"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const MB = 1024 * 1024

interface UserEditorProps {
  userId: string
  onBack: () => void
}

const UserEditor = ({ userId, onBack }: UserEditorProps) => {
  const { t } = useTranslation("admin")
  const queryClient = useQueryClient()

  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => fetchAdminUser(userId),
  })
  const { data: roles } = useQuery({ queryKey: ["admin", "roles"], queryFn: fetchAdminRoles })

  const [roleToAdd, setRoleToAdd] = useState("")

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] })
    void queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] })
  }

  const assign = useMutation({
    mutationFn: () => assignRole(userId, roleToAdd),
    onSuccess: () => {
      toast.success(t("userDetailSheet.roleAssigned"))
      setRoleToAdd("")
      refresh()
    },
    onError: () => toast.error(t("userDetailSheet.assignError")),
  })

  const unassign = useMutation({
    mutationFn: (roleId: string) => unassignRole(userId, roleId),
    onSuccess: () => {
      toast.success(t("userDetailSheet.roleRemoved"))
      refresh()
    },
    onError: () => toast.error(t("userDetailSheet.unassignError")),
  })

  const assignedIds = new Set((detail?.roles ?? []).map((role) => role.id))
  const assignable = (roles ?? []).filter((role) => !assignedIds.has(role.id))

  return (
    <InlineEditor onBack={onBack}>
      {isLoading || !detail ? (
        <PageSpinner />
      ) : (
        <div className="flex flex-col gap-6">
          <header className="flex items-center gap-4">
            <Avatar size="lg">
              <AvatarFallback>{initials(detail.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold">{detail.name}</h1>
              <p className="text-muted-foreground truncate text-sm">{detail.email}</p>
            </div>
            {detail.role === "admin" || detail.role === "owner" ? (
              <Badge variant="secondary">{t("users.admin")}</Badge>
            ) : null}
            {detail.banned ? <Badge variant="destructive">{t("users.banned")}</Badge> : null}
          </header>

          <section className="flex flex-col gap-1">
            <h3 className="text-xs font-semibold tracking-wide uppercase">
              {t("userDetailSheet.usage")}
            </h3>
            {(() => {
              const quota = detail.limits.find((entry) => entry.key === "storage.quota.bytes")?.value
              const quotaBytes = typeof quota === "number" ? quota : null
              return (
                <p className="text-sm tabular-nums">
                  {formatBytes(detail.usageBytes)}
                  <span className="text-muted-foreground">
                    {" / "}
                    {quotaBytes !== null
                      ? formatBytes(quotaBytes)
                      : t("userDetailSheet.unlimited")}
                  </span>
                </p>
              )
            })()}
          </section>

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
                      <X className="size-3" />
                    </Button>
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground text-sm">{t("userDetailSheet.noRoles")}</span>
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
                subjectType="user"
                subjectId={detail.id}
                limit={limit}
                inherited={
                  limit.value == null
                    ? t("limitOverrideRow.unlimited")
                    : `${Math.round(Number(limit.value) / MB)} MB`
                }
                onChanged={refresh}
              />
            ))}
          </section>
        </div>
      )}
    </InlineEditor>
  )
}

export default UserEditor
