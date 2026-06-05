"use client"

import { useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { driveFolderIdFromPath, fetchNodes } from "@lib/drive"
import { createDoc } from "@lib/docs"
import { Icon } from "@lib/icons"
import { useUploadManager } from "@lib/uploadManager"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setDriveDetailsOpen } from "@store/uiSlice"
import { IconFilePlus, IconInfoCircle } from "@tabler/icons-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { toast } from "sonner"
import NewFolderDialog from "@pages/Drive/components/NewFolderDialog/NewFolderDialog"

/** Drive title-bar actions: details toggle, new folder, upload. Resolves the folder from the URL. */
const DriveTopActions = () => {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const detailsOpen = useAppSelector((state) => state.ui.driveDetailsOpen)
  const queryClient = useQueryClient()
  const upload = useUploadManager()
  const fileInput = useRef<HTMLInputElement>(null)

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
      const doc = await createDoc(parentId)
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
      {parentId ? <NewFolderDialog parentId={parentId} onDone={invalidate} /> : null}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="New document"
        disabled={!parentId}
        onClick={() => void newDocument()}
      >
        <IconFilePlus className="size-4" />
      </Button>
      <Button size="sm" disabled={!parentId} onClick={() => fileInput.current?.click()}>
        <Icon name="download" className="size-4 rotate-180" />
        Upload
      </Button>
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
