"use client"

import { useState } from "react"
import {
  type AdminGroup,
  addGroupMember,
  createAdminGroup,
  fetchAdminGroups,
  fetchAdminUsers,
} from "@lib/admin"
import GroupDetailSheet from "@pages/Admin/components/GroupDetailSheet/GroupDetailSheet"
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
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { toast } from "sonner"

const AddMember = ({ groupId }: { groupId: string }) => {
  const { data: users } = useQuery({ queryKey: ["admin", "users"], queryFn: fetchAdminUsers })
  const [userId, setUserId] = useState("")
  const add = useMutation({
    mutationFn: () => addGroupMember(groupId, userId),
    onSuccess: () => {
      toast.success("Member added")
      setUserId("")
    },
    onError: () => toast.error("Could not add the member"),
  })

  return (
    <div className="flex items-center gap-2">
      <Select value={userId} onValueChange={(value) => setUserId(value ?? "")}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Add a member…" />
        </SelectTrigger>
        <SelectContent>
          {(users ?? []).map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="secondary"
        disabled={!userId || add.isPending}
        onClick={() => add.mutate()}
      >
        Add
      </Button>
    </div>
  )
}

const Groups = () => {
  const queryClient = useQueryClient()
  const { data: groups, isLoading } = useQuery({
    queryKey: ["admin", "groups"],
    queryFn: fetchAdminGroups,
  })
  const [name, setName] = useState("")
  const [selected, setSelected] = useState<string | null>(null)

  const create = useMutation({
    mutationFn: () => createAdminGroup(name.trim()),
    onSuccess: () => {
      toast.success("Group created")
      setName("")
      void queryClient.invalidateQueries({ queryKey: ["admin", "groups"] })
      void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] })
    },
    onError: () => toast.error("Could not create the group"),
  })

  const groupRow = (group: AdminGroup) => (
    <div key={group.id} className="flex items-center gap-3 px-3 py-3">
      <Button
        variant="ghost"
        onClick={() => setSelected(group.id)}
        className="-mx-1 h-auto min-w-0 flex-1 flex-col items-start gap-0 px-1 py-1 font-normal"
      >
        <span className="w-full truncate text-sm font-medium">{group.name}</span>
        {group.description ? (
          <span className="text-muted-foreground w-full truncate text-xs">{group.description}</span>
        ) : null}
      </Button>
      <AddMember groupId={group.id} />
    </div>
  )

  return (
    <AdminPage
      title="Groups"
      description="Bundle users so roles and limits apply to many people at once."
      action={
        <div className="flex items-center gap-2">
          <Input
            value={name}
            placeholder="New group name"
            onChange={(event) => setName(event.target.value)}
            className="w-48"
          />
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            Create
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <PageSpinner />
      ) : groups && groups.length > 0 ? (
        <div className="panel divide-border/60 divide-y overflow-hidden rounded-xl">
          {groups.map(groupRow)}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No groups yet.</p>
      )}
      <GroupDetailSheet groupId={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </AdminPage>
  )
}

export default Groups
