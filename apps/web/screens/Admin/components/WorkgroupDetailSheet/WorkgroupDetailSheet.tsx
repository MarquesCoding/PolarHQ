"use client"

import { useState } from "react"
import {
  type GroupLimit,
  addWorkgroupGroup,
  clearLimitFor,
  fetchAdminGroups,
  fetchAdminWorkgroup,
  removeWorkgroupGroup,
  setLimitFor,
} from "@lib/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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

const overrideDisplay = (limit: GroupLimit): string =>
  limit.hasOverride && limit.override != null ? String(Math.round(Number(limit.override) / MB)) : ""

const LimitOverrideRow = ({
  workgroupId,
  limit,
  onChanged,
}: {
  workgroupId: string
  limit: GroupLimit
  onChanged: () => void
}) => {
  const [draft, setDraft] = useState(() => overrideDisplay(limit))

  const save = useMutation({
    mutationFn: () => {
      const trimmed = draft.trim()
      const value = trimmed === "" ? null : Math.round(Number(trimmed) * MB)
      return setLimitFor("workgroup", workgroupId, limit.key, value)
    },
    onSuccess: () => {
      toast.success(`${limit.label} override saved`)
      onChanged()
    },
    onError: () => toast.error("Could not save the override"),
  })

  const clear = useMutation({
    mutationFn: () => clearLimitFor("workgroup", workgroupId, limit.key),
    onSuccess: () => {
      toast.success("Override removed")
      setDraft("")
      onChanged()
    },
    onError: () => toast.error("Could not remove the override"),
  })

  const inherited =
    limit.instanceValue == null ? "unlimited" : `${Math.round(Number(limit.instanceValue) / MB)} MB`

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{limit.label}</span>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          value={draft}
          placeholder={`Instance: ${inherited}`}
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

interface WorkgroupDetailSheetProps {
  workgroupId: string | null
  onOpenChange: (open: boolean) => void
}

const WorkgroupDetailSheet = ({ workgroupId, onOpenChange }: WorkgroupDetailSheetProps) => {
  const queryClient = useQueryClient()
  const open = workgroupId != null

  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin", "workgroup", workgroupId],
    queryFn: () => fetchAdminWorkgroup(workgroupId as string),
    enabled: open,
  })
  const { data: groups } = useQuery({ queryKey: ["admin", "groups"], queryFn: fetchAdminGroups })

  const [groupToAdd, setGroupToAdd] = useState("")

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "workgroup", workgroupId] })
    void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] })
  }

  const add = useMutation({
    mutationFn: () => addWorkgroupGroup(workgroupId as string, groupToAdd),
    onSuccess: () => {
      toast.success("Group added")
      setGroupToAdd("")
      refresh()
    },
    onError: () => toast.error("Could not add the group"),
  })

  const remove = useMutation({
    mutationFn: (groupId: string) => removeWorkgroupGroup(workgroupId as string, groupId),
    onSuccess: () => {
      toast.success("Group removed")
      refresh()
    },
    onError: () => toast.error("Could not remove the group"),
  })

  const memberIds = new Set((detail?.groups ?? []).map((group) => group.id))
  const addable = (groups ?? []).filter((group) => !memberIds.has(group.id))

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
                Groups · {detail.groups.length}
              </h3>
              <div className="panel divide-border/60 divide-y overflow-hidden rounded-xl">
                {detail.groups.length > 0 ? (
                  detail.groups.map((group) => (
                    <div key={group.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {group.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${group.name}`}
                        onClick={() => remove.mutate(group.id)}
                      >
                        <IconX className="size-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground px-3 py-2 text-sm">No groups yet.</p>
                )}
              </div>
              {addable.length > 0 ? (
                <div className="mt-1 flex items-center gap-2">
                  <Select value={groupToAdd} onValueChange={(value) => setGroupToAdd(value ?? "")}>
                    <SelectTrigger className="w-52">
                      <SelectValue placeholder="Add a group…" />
                    </SelectTrigger>
                    <SelectContent>
                      {addable.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!groupToAdd || add.isPending}
                    onClick={() => add.mutate()}
                  >
                    Add
                  </Button>
                </div>
              ) : null}
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-xs font-semibold tracking-wide uppercase">Limit overrides</h3>
              {detail.limits.map((limit) => (
                <LimitOverrideRow
                  key={limit.key}
                  workgroupId={detail.id}
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

export default WorkgroupDetailSheet
