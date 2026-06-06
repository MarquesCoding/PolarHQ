"use client"

import { useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { driveFolderIdFromPath, emptyDriveTrash, fetchNodes } from "@lib/drive"
import type { DocType } from "@lib/docs"
import { createEncryptedDoc } from "@lib/e2e"
import { useUploadManager } from "@lib/uploadManager"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setDriveDetailsOpen } from "@store/uiSlice"
import {
  IconDots,
  IconFilePlus,
  IconFolderPlus,
  IconInfoCircle,
  IconPresentation,
  IconTable,
  IconTrashX,
  IconUpload,
} from "@tabler/icons-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
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

  if (pathname.endsWith("/trash")) {
    return (
      <ConfirmButton
        icon={<IconTrashX className="size-4" />}
        confirmLabel="Empty trash?"
        onConfirm={async () => {
          try {
            await emptyDriveTrash()
            toast.success("Trash emptied")
            void queryClient.invalidateQueries({ queryKey: ["drive"] })
            void queryClient.invalidateQueries({ queryKey: ["photos"] })
          } catch {
            toast.error("Action failed")
          }
        }}
      >
        Empty trash
      </ConfirmButton>
    )
  }

  if (folderId === null) return null

  const parentId = data?.parent.id ?? null
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["drive"] })
  const uploadFiles = (files: FileList) => {
    if (parentId) upload.upload(files, { kind: "drive", parentId })
  }
  const routes: Record<DocType, string> = { doc: "/docs", sheet: "/sheets", slides: "/slides" }
  const newDoc = async (type: DocType) => {
    try {
      const doc = await createEncryptedDoc(parentId, type)
      void queryClient.invalidateQueries({ queryKey: ["docs"] })
      router.push(`${routes[type]}/${doc.id}`)
    } catch {
      toast.error("Could not create")
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
          <DropdownMenuItem onClick={() => void newDoc("doc")}>
            <IconFilePlus className="size-4" />
            New document
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void newDoc("sheet")}>
            <IconTable className="size-4" />
            New spreadsheet
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void newDoc("slides")}>
            <IconPresentation className="size-4" />
            New presentation
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
