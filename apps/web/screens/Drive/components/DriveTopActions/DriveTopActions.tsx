import { useRef, useState } from "react"
import { usePathname, useNavigation } from "@workspace/screens/platform"
import { driveFolderIdFromPath, emptyDriveTrash, fetchNodes } from "@workspace/core/drive"
import type { DocType } from "@workspace/core/docs"
import { createEncryptedDoc } from "@workspace/core/e2e"
import { useUploadManager } from "@lib/uploadManager"
import { useAppDispatch, useAppSelector } from "@workspace/screens/store/hooks"
import { setDriveDetailsOpen } from "@workspace/screens/store/uiSlice"
import {
  FilePlus,
  FolderPlus,
  Info,
  Plus,
  Table,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react"
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
import { useTranslation } from "react-i18next"
import NewFolderDialog from "@pages/Drive/components/NewFolderDialog/NewFolderDialog"

/** Drive title-bar actions: details toggle and a create/upload menu. Resolves the folder from the URL. */
const DriveTopActions = () => {
  const { t } = useTranslation("drive")
  const pathname = usePathname()
  const router = useNavigation()
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
        icon={<Trash className="size-4" />}
        confirmLabel={t("driveTopActions.emptyTrashConfirm")}
        onConfirm={async () => {
          try {
            await emptyDriveTrash()
            toast.success(t("driveTopActions.trashEmptied"))
            void queryClient.invalidateQueries({ queryKey: ["drive"] })
            void queryClient.invalidateQueries({ queryKey: ["photos"] })
          } catch {
            toast.error(t("errors:actionFailed"))
          }
        }}
      >
        {t("driveTopActions.emptyTrash")}
      </ConfirmButton>
    )
  }

  if (folderId === null) return null

  const parentId = data?.parent.id ?? null
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["drive"] })
  const uploadFiles = (files: FileList) => {
    if (parentId) upload.upload(files, { kind: "drive", parentId })
  }
  const routes: Record<DocType, string> = {
    doc: "/docs",
    sheet: "/sheets",
    board: "/whiteboards",
  }
  const newDoc = async (type: DocType) => {
    try {
      const doc = await createEncryptedDoc(parentId, type)
      void queryClient.invalidateQueries({ queryKey: ["docs"] })
      router.push(`${routes[type]}/${doc.id}`)
    } catch {
      toast.error(t("driveTopActions.couldNotCreate"))
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={detailsOpen ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label={t("driveTopActions.toggleDetails")}
        onClick={() => dispatch(setDriveDetailsOpen(!detailsOpen))}
      >
        <Info className="size-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={t("driveTopActions.new")} disabled={!parentId}>
              <Plus className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => fileInput.current?.click()}>
            <UploadSimple className="size-4" />
            {t("driveTopActions.uploadFiles")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="size-4" />
            {t("driveTopActions.newFolder")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void newDoc("doc")}>
            <FilePlus className="size-4" />
            {t("driveTopActions.newDocument")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void newDoc("sheet")}>
            <Table className="size-4" />
            {t("driveTopActions.newSpreadsheet")}
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
