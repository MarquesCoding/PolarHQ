"use client"

import { useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { driveFolderIdFromPath, fetchNodes } from "@lib/drive"
import { createEncryptedDoc } from "@lib/e2e"
import { useUploadManager } from "@lib/uploadManager"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setDriveDetailsOpen } from "@store/uiSlice"
import {
  IconDots,
  IconFilePlus,
  IconFolderPlus,
  IconInfoCircle,
  IconUpload,
} from "@tabler/icons-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { toast } from "sonner"
import NewFolderDialog from "@pages/Drive/components/NewFolderDialog/NewFolderDialog"

/** Drive title-bar actions: details toggle and a create/upload menu. Resolves the folder from the URL. */
const DriveTopActions = () => {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const detailsOpen = useAppSelector((state) => state.ui.driveDetailsOpen)
  const queryClient = useQueryClient()
  const upload = useUploadManager()
  const fileInput = useRef<HTMLInputElement>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)

  const folderId = driveFolderIdFromPath(pathname)
  const enabled = folderId !== null
  const { data } = useQuery({
    queryKey: ["drive", "nodes", folderId ?? "root"],
    queryFn: () => fetchNodes(folderId ?? undefined),
    enabled,
  })

  if (folderId === null) return null

  const parentId = data?.parent.id ?? null
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["drive"] })
  const uploadFiles = (files: FileList) => {
    if (parentId) upload.upload(files, { kind: "drive", parentId })
  }
  const newDocument = async () => {
    try {
      const doc = await createEncryptedDoc(parentId)
      void queryClient.invalidateQueries({ queryKey: ["docs"] })
      router.push(`/docs/${doc.id}`)
    } catch {
      toast.error("Could not create document")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={detailsOpen ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label="Toggle details"
        onClick={() => dispatch(setDriveDetailsOpen(!detailsOpen))}
      >
        <IconInfoCircle className="size-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label="New" disabled={!parentId}>
              <IconDots className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => fileInput.current?.click()}>
            <IconUpload className="size-4" />
            Upload files
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setNewFolderOpen(true)}>
            <IconFolderPlus className="size-4" />
            New folder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void newDocument()}>
            <IconFilePlus className="size-4" />
            New document
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {parentId ? (
        <NewFolderDialog
          parentId={parentId}
          open={newFolderOpen}
          onOpenChange={setNewFolderOpen}
          onDone={invalidate}
        />
      ) : null}
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files) uploadFiles(event.target.files)
          event.target.value = ""
        }}
      />
    </div>
  )
}

export default DriveTopActions
