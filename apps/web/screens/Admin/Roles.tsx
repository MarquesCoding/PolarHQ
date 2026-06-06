"use client"

import { useState } from "react"
import { type AdminRole, createAdminRole, fetchAdminRoles } from "@lib/admin"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { PageSpinner } from "@components/Spinner/Spinner"
import AdminPage from "@pages/Admin/components/AdminPage/AdminPage"
import { toast } from "sonner"

const CreateRoleDialog = ({ onCreated }: { onCreated: () => void }) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [permissions, setPermissions] = useState("")

  const create = useMutation({
    mutationFn: () => {
      const list = permissions
        .split(/[\s,]+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
      return createAdminRole(name.trim(), description.trim(), list)
    },
    onSuccess: () => {
      toast.success("Role created")
      setName("")
      setDescription("")
      setPermissions("")
      setOpen(false)
      onCreated()
    },
    onError: () => toast.error("Could not create the role"),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>New role</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New role</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-name">Name</Label>
            <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-desc">Description</Label>
            <Input
              id="role-desc"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role-perms">Permissions</Label>
            <Input
              id="role-perms"
              value={permissions}
              placeholder="photos.* drive.file.read"
              onChange={(event) => setPermissions(event.target.value)}
            />
            <span className="text-muted-foreground text-xs">
              Space or comma separated. Wildcards like <code>photos.*</code> are allowed.
            </span>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Cancel</Button>} />
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>
            Create role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const Roles = () => {
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
          {role.isSystem ? <Badge variant="secondary">System</Badge> : null}
        </span>
        {role.description ? (
          <span className="text-muted-foreground truncate text-xs">{role.description}</span>
        ) : null}
      </div>
    </div>
  )

  return (
    <AdminPage
      title="Roles"
      description="Permission sets you can assign to users and groups."
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
