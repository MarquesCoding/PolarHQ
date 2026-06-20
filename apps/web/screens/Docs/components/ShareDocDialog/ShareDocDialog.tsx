import { useState } from "react"
import {
  type DocRole,
  addDocCollaborator,
  fetchDocCollaborators,
  removeDocCollaborator,
} from "@workspace/core/docs"
import { authClient } from "@workspace/core/authClient"
import { type ShareKeyResult, isDocEncrypted, rekeyDoc, shareDocKey } from "@workspace/core/e2e"
import { Trash } from "@phosphor-icons/react"
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
import { useTranslation } from "react-i18next"
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
  const { t } = useTranslation("docs")
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
      if (await isDocEncrypted(nodeId!)) return shareDocKey(nodeId!, targetEmail)
      return { status: "ok", fingerprint: "" }
    },
    onSuccess: (result) => {
      setEmail("")
      refresh()
      if (result.status === "key-changed")
        toast.error(t("shareDocDialog.keyChanged", { fingerprint: result.fingerprint }))
      else if (result.status === "no-recipient")
        toast.warning(t("shareDocDialog.noRecipient"))
      else if (result.status === "ok" && result.fingerprint)
        toast.success(t("shareDocDialog.accessGrantedVerify", { fingerprint: result.fingerprint }))
      else toast.success(t("shareDocDialog.accessGranted"))
    },
    onError: (error) => toast.error((error as Error).message || t("shareDocDialog.couldNotShare")),
  })

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      await removeDocCollaborator(nodeId!, userId)
      const selfId = session?.user.id
      if (selfId && (await isDocEncrypted(nodeId!))) await rekeyDoc(nodeId!, selfId)
    },
    onSuccess: () => {
      refresh()
      toast.success(t("shareDocDialog.accessRevoked"))
    },
    onError: () => toast.error(t("shareDocDialog.couldNotRemove")),
  })

  const list = collaborators ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="truncate">{t("shareDocDialog.title", { name })}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Input
            type="email"
            placeholder={t("shareDocDialog.emailPlaceholder")}
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
              <SelectItem value="editor">{t("shareDocDialog.roleEditor")}</SelectItem>
              <SelectItem value="viewer">{t("shareDocDialog.roleViewer")}</SelectItem>
            </SelectContent>
          </Select>
          <Button disabled={!email.trim() || add.isPending} onClick={() => add.mutate()}>
            {t("shareDocDialog.add")}
          </Button>
        </div>

        <div className="scrollbar-slim flex max-h-60 flex-col gap-0.5 overflow-y-auto">
          {list.length === 0 ? (
            <p className="text-muted-foreground py-2 text-sm">{t("shareDocDialog.onlyYou")}</p>
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
                  aria-label={t("shareDocDialog.remove", { name: collaborator.name })}
                  onClick={() => remove.mutate(collaborator.userId)}
                >
                  <Trash className="size-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("shareDocDialog.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ShareDocDialog
