import { useState } from "react"
import {
  type GroupLimit,
  addGroupMember,
  clearLimitFor,
  fetchAdminGroup,
  fetchAdminUsers,
  removeGroupMember,
  setLimitFor,
} from "@workspace/core/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
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
import { X } from "@phosphor-icons/react"
import Spinner from "@components/Spinner/Spinner"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

const MB = 1024 * 1024

const overrideDisplay = (limit: GroupLimit): string =>
  limit.hasOverride && limit.override != null ? String(Math.round(Number(limit.override) / MB)) : ""

const initials = (name: string): string =>
  name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

const LimitOverrideRow = ({
  groupId,
  limit,
  onChanged,
}: {
  groupId: string
  limit: GroupLimit
  onChanged: () => void
}) => {
  const { t } = useTranslation("admin")
  const [draft, setDraft] = useState(() => overrideDisplay(limit))

  const save = useMutation({
    mutationFn: () => {
      const trimmed = draft.trim()
      const value = trimmed === "" ? null : Math.round(Number(trimmed) * MB)
      return setLimitFor("group", groupId, limit.key, value)
    },
    onSuccess: () => {
      toast.success(t("groupDetailSheet.overrideSaved", { label: limit.label }))
      onChanged()
    },
    onError: () => toast.error(t("groupDetailSheet.overrideSaveError")),
  })

  const clear = useMutation({
    mutationFn: () => clearLimitFor("group", groupId, limit.key),
    onSuccess: () => {
      toast.success(t("groupDetailSheet.overrideRemoved"))
      setDraft("")
      onChanged()
    },
    onError: () => toast.error(t("groupDetailSheet.overrideRemoveError")),
  })

  const inherited =
    limit.instanceValue == null
      ? t("groupDetailSheet.unlimited")
      : `${Math.round(Number(limit.instanceValue) / MB)} MB`

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{limit.label}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={draft}
          placeholder={t("groupDetailSheet.instancePlaceholder", { value: inherited })}
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
          {t("groupDetailSheet.save")}
        </Button>
        {limit.hasOverride ? (
          <Button size="sm" variant="ghost" disabled={clear.isPending} onClick={() => clear.mutate()}>
            {t("groupDetailSheet.reset")}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

interface GroupDetailSheetProps {
  groupId: string | null
  onOpenChange: (open: boolean) => void
}

const GroupDetailSheet = ({ groupId, onOpenChange }: GroupDetailSheetProps) => {
  const { t } = useTranslation("admin")
  const queryClient = useQueryClient()
  const open = groupId != null

  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin", "group", groupId],
    queryFn: () => fetchAdminGroup(groupId as string),
    enabled: open,
  })
  const { data: users } = useQuery({ queryKey: ["admin", "users"], queryFn: fetchAdminUsers })

  const [userToAdd, setUserToAdd] = useState("")

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "group", groupId] })
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] })
  }

  const add = useMutation({
    mutationFn: () => addGroupMember(groupId as string, userToAdd),
    onSuccess: () => {
      toast.success(t("groupDetailSheet.memberAdded"))
      setUserToAdd("")
      refresh()
    },
    onError: () => toast.error(t("groupDetailSheet.memberAddError")),
  })

  const remove = useMutation({
    mutationFn: (userId: string) => removeGroupMember(groupId as string, userId),
    onSuccess: () => {
      toast.success(t("groupDetailSheet.memberRemoved"))
      refresh()
    },
    onError: () => toast.error(t("groupDetailSheet.memberRemoveError")),
  })

  const memberIds = new Set((detail?.members ?? []).map((member) => member.id))
  const addable = (users ?? []).filter((user) => !memberIds.has(user.id))

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
              {detail.description ? (
                <span className="text-muted-foreground text-sm">{detail.description}</span>
              ) : null}
            </SheetHeader>

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
                        <span className="text-muted-foreground truncate text-xs">
                          {member.email}
                        </span>
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
                  groupId={detail.id}
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

export default GroupDetailSheet
