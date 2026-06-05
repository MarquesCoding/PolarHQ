"use client"

import { type DriveNode, fetchVersions, restoreDriveVersion } from "@lib/drive"
import { formatBytes } from "@lib/format"
import { Icon } from "@lib/icons"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { toast } from "sonner"

interface VersionHistoryDialogProps {
  node: DriveNode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDone: () => void
}

const VersionHistoryDialog = ({ node, open, onOpenChange, onDone }: VersionHistoryDialogProps) => {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ["drive", "versions", node?.id],
    queryFn: () => fetchVersions(node!.id),
    enabled: open && Boolean(node),
  })

  const restore = useMutation({
    mutationFn: (versionId: string) => restoreDriveVersion(node!.id, versionId),
    onSuccess: () => {
      toast.success("Version restored")
      void queryClient.invalidateQueries({ queryKey: ["drive"] })
      onDone()
      onOpenChange(false)
    },
    onError: () => toast.error("Could not restore"),
  })

  const versions = data?.versions ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : versions.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No previous versions. Re-upload a file with the same name to create one.
          </p>
        ) : (
          <ul className="scrollbar-slim flex max-h-80 flex-col gap-1 overflow-y-auto">
            {versions.map((version, index) => (
              <li
                key={version.id}
                className="border-border/60 flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">Version {versions.length - index}</p>
                  <p className="text-muted-foreground text-xs">
                    {new Date(version.createdAt).toLocaleString()} · {formatBytes(version.sizeBytes ?? 0)}
                  </p>
                </div>
                <a
                  href={version.downloadUrl}
                  download={version.name}
                  aria-label="Download version"
                  className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                >
                  <Icon name="download" className="size-4" />
                </a>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restore.isPending}
                  onClick={() => restore.mutate(version.id)}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default VersionHistoryDialog
