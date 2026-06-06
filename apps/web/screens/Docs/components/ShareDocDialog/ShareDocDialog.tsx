"use client"

import { useState } from "react"
import {
  type DocRole,
  addDocCollaborator,
  fetchDocCollaborators,
  removeDocCollaborator,
} from "@lib/docs"
import { authClient } from "@lib/authClient"
import { type ShareKeyResult, isDocEncrypted, rekeyDoc, shareDocKey } from "@lib/e2e"
import { IconTrash } from "@tabler/icons-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { toast } from "sonner"

interface ShareDocDialogProps {
  nodeId: string | null
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Grant or revoke other users' access to a document (owner only). */
const ShareDocDialog = ({ nodeId, name, open, onOpenChange }: ShareDocDialogProps) => {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<DocRole>("editor")

  const { data: collaborators } = useQuery({
    queryKey: ["docs", "collaborators", nodeId],
    queryFn: () => fetchDocCollaborators(nodeId!),
    enabled: open && Boolean(nodeId),
  })

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["docs", "collaborators", nodeId] })

  const add = useMutation({
    mutationFn: async (): Promise<ShareKeyResult> => {
      const targetEmail = email.trim()
      await addDocCollaborator(nodeId!, targetEmail, role)
      // For an encrypted doc, wrap its content key to the new collaborator's public key.
      if (await isDocEncrypted(nodeId!)) return shareDocKey(nodeId!, targetEmail)
      return { status: "ok", fingerprint: "" }
    },
    onSuccess: (result) => {
      setEmail("")
      refresh()
      if (result.status === "key-changed")
        toast.error(
          `Their encryption key changed — not shared. Verify their key (${result.fingerprint}) out of band before sharing.`,
        )
      else if (result.status === "no-recipient")
        toast.warning("Added — they haven’t set up encryption yet. Re-share once they have.")
      else if (result.status === "ok" && result.fingerprint)
        toast.success(`Access granted. Verify their key: ${result.fingerprint}`)
      else toast.success("Access granted")
    },
    onError: (error) => toast.error((error as Error).message || "Could not share"),
  })

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      await removeDocCollaborator(nodeId!, userId)
      // Rotate the content key so the removed collaborator can no longer decrypt the doc.
      const selfId = session?.user.id
      if (selfId && (await isDocEncrypted(nodeId!))) await rekeyDoc(nodeId!, selfId)
    },
    onSuccess: () => {
      refresh()
      toast.success("Access revoked")
    },
    onError: () => toast.error("Could not remove"),
  })

  const list = collaborators ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="truncate">Share “{name}”</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            type="email"
            placeholder="Add people by email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && email.trim()) add.mutate()
            }}
          />
          <Select value={role} onValueChange={(value) => value && setRole(value as DocRole)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
          <Button disabled={!email.trim() || add.isPending} onClick={() => add.mutate()}>
            Add
          </Button>
        </div>

        <div className="scrollbar-slim flex max-h-60 flex-col gap-0.5 overflow-y-auto">
          {list.length === 0 ? (
            <p className="text-muted-foreground py-2 text-sm">Only you have access.</p>
          ) : (
            list.map((collaborator) => (
              <div
                key={collaborator.userId}
                className="hover:bg-sidebar-accent/40 flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{collaborator.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {collaborator.email} · {collaborator.role}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove ${collaborator.name}`}
                  onClick={() => remove.mutate(collaborator.userId)}
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ShareDocDialog
