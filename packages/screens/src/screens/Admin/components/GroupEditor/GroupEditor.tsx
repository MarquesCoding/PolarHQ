import { useState } from "react"
import {
  addGroupMember,
  fetchAdminGroup,
  fetchAdminUsers,
  removeGroupMember,
} from "@workspace/core/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
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

interface GroupEditorProps {
  groupId: string
  onBack: () => void
}

const GroupEditor = ({ groupId, onBack }: GroupEditorProps) => {
  const { t } = useTranslation("admin")
  const queryClient = useQueryClient()

  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin", "group", groupId],
    queryFn: () => fetchAdminGroup(groupId),
  })
  const { data: users } = useQuery({ queryKey: ["admin", "users"], queryFn: fetchAdminUsers })

  const [userToAdd, setUserToAdd] = useState("")

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "group", groupId] })
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] })
  }

  const add = useMutation({
    mutationFn: () => addGroupMember(groupId, userToAdd),
    onSuccess: () => {
      toast.success(t("groupDetailSheet.memberAdded"))
      setUserToAdd("")
      refresh()
    },
    onError: () => toast.error(t("groupDetailSheet.memberAddError")),
  })

  const remove = useMutation({
    mutationFn: (userId: string) => removeGroupMember(groupId, userId),
    onSuccess: () => {
      toast.success(t("groupDetailSheet.memberRemoved"))
      refresh()
    },
    onError: () => toast.error(t("groupDetailSheet.memberRemoveError")),
  })

  const memberIds = new Set((detail?.members ?? []).map((member) => member.id))
  const addable = (users ?? []).filter((user) => !memberIds.has(user.id))

  return (
    <InlineEditor onBack={onBack}>
      {isLoading || !detail ? (
        <PageSpinner />
      ) : (
        <div className="flex flex-col gap-6">
          <header className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{detail.name}</h1>
            {detail.description ? (
              <p className="text-muted-foreground truncate text-sm">{detail.description}</p>
            ) : null}
          </header>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide uppercase">
              {t("groupDetailSheet.membersHeading", { count: detail.members.length })}
            </h3>
            <div className="panel divide-border/60 divide-y overflow-hidden rounded-xl">
              {detail.members.length > 0 ? (
                detail.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 px-3 py-2">
                    <Avatar size="sm">
                      <AvatarFallback>{initials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium">{member.name}</span>
                      <span className="text-muted-foreground truncate text-xs">{member.email}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("groupDetailSheet.removeMember", { name: member.name })}
                      onClick={() => remove.mutate(member.id)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground px-3 py-2 text-sm">
                  {t("groupDetailSheet.noMembers")}
                </p>
              )}
            </div>
            {addable.length > 0 ? (
              <div className="mt-1 flex items-center gap-2">
                <Select value={userToAdd} onValueChange={(value) => setUserToAdd(value ?? "")}>
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder={t("groupDetailSheet.addMemberPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {addable.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!userToAdd || add.isPending}
                  onClick={() => add.mutate()}
                >
                  {t("groupDetailSheet.add")}
                </Button>
              </div>
            ) : null}
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold tracking-wide uppercase">
              {t("groupDetailSheet.limitOverrides")}
            </h3>
            {detail.limits.map((limit) => (
              <LimitOverrideRow
                key={limit.key}
                subjectType="group"
                subjectId={detail.id}
                limit={limit}
                inherited={
                  limit.instanceValue == null
                    ? t("groupDetailSheet.unlimited")
                    : `${Math.round(Number(limit.instanceValue) / MB)} MB`
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

export default GroupEditor
