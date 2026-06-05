"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  type DriveNode,
  copyDriveNode,
  createShareLink,
  extractDriveNode,
  fetchNodes,
  isArchiveName,
  moveDriveNode,
  trashDriveNode,
} from "@lib/drive"
import { createDoc, isDocNode } from "@lib/docs"
import { Icon } from "@lib/icons"
import { SelectionProvider, useSelection } from "@lib/selection"
import { useArmedConfirm } from "@lib/useArmedConfirm"
import { useSelectionHotkeys } from "@lib/useSelectionHotkeys"
import { useUploadManager } from "@lib/uploadManager"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setDriveDetailsOpen } from "@store/uiSlice"
import { IconArchive, IconFileExport, IconPencil, IconUserPlus } from "@tabler/icons-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { AnimatePresence } from "motion/react"
import { toast } from "sonner"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import DropZone from "@components/DropZone/DropZone"
import SelectionBar from "@components/SelectionBar/SelectionBar"
import { PageSpinner } from "@components/Spinner/Spinner"
import ShareDialog from "@components/ShareDialog/ShareDialog"
import DetailsPanel from "@pages/Drive/components/DetailsPanel/DetailsPanel"
import DriveBackgroundMenu from "@pages/Drive/components/DriveBackgroundMenu/DriveBackgroundMenu"
import ImageViewer from "@pages/Drive/components/ImageViewer/ImageViewer"
import MoveDialog from "@pages/Drive/components/MoveDialog/MoveDialog"
import NewFolderDialog from "@pages/Drive/components/NewFolderDialog/NewFolderDialog"
import { DRIVE_NODES_MIME } from "@pages/Drive/components/NodeCard/NodeCard"
import NodeGrid from "@pages/Drive/components/NodeGrid/NodeGrid"
import type { DriveNodeActions } from "@pages/Drive/components/NodeContextMenu/NodeContextMenu"
import NodeTable from "@pages/Drive/components/NodeTable/NodeTable"
import RenameDialog from "@pages/Drive/components/RenameDialog/RenameDialog"
import VersionHistoryDialog from "@pages/Drive/components/VersionHistoryDialog/VersionHistoryDialog"

interface BrowserProps {
  folderId?: string
}

const BrowserInner = ({ folderId }: BrowserProps) => {
  const router = useRouter()
  const queryClient = useQueryClient()
  const selection = useSelection()
  const upload = useUploadManager()
  const dispatch = useAppDispatch()
  const viewMode = useAppSelector((state) => state.ui.viewMode)
  const detailsOpen = useAppSelector((state) => state.ui.driveDetailsOpen)
  const search = useAppSelector((state) => state.ui.searchQuery).trim().toLowerCase()

  const [renaming, setRenaming] = useState<DriveNode | null>(null)
  const [moving, setMoving] = useState<string[] | null>(null)
  const [versionsNode, setVersionsNode] = useState<DriveNode | null>(null)
  const [shareNode, setShareNode] = useState<DriveNode | null>(null)
  const [viewingNode, setViewingNode] = useState<DriveNode | null>(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const queryKey = ["drive", "nodes", folderId ?? "root"]
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => fetchNodes(folderId) })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["drive"] })
    void queryClient.invalidateQueries({ queryKey: ["photos"] })
  }

  const parentId = data?.parent.id ?? null
  const children = data?.children ?? []
  const visible = search
    ? children.filter((node) => node.name.toLowerCase().includes(search))
    : children
  const byId = new Map(children.map((node) => [node.id, node]))

  const trail = data?.breadcrumb ?? []
  const parentFolder = trail.length > 1 ? trail[trail.length - 2]! : null
  const parentHref = parentFolder
    ? trail.length === 2
      ? "/drive"
      : `/drive/${parentFolder.id}`
    : null

  const downloadIds = (ids: string[]) => {
    for (const id of ids) {
      const node = byId.get(id)
      if (node?.kind === "file" && node.downloadUrl) {
        const anchor = document.createElement("a")
        anchor.href = node.downloadUrl
        anchor.download = node.name
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      }
    }
  }

  const open = (node: DriveNode) => {
    if (node.kind === "folder") router.push(`/drive/${node.id}`)
    else if (isDocNode(node)) router.push(`/docs/${node.id}`)
    else if (node.mimeType?.startsWith("image/")) setViewingNode(node)
    else downloadIds([node.id])
  }

  const newDocument = async () => {
    try {
      const doc = await createDoc(parentId)
      router.push(`/docs/${doc.id}`)
    } catch {
      toast.error("Could not create document")
    }
  }

  const moveInto = async (folder: DriveNode, ids: string[]) => {
    try {
      await Promise.all(ids.map((id) => moveDriveNode(id, folder.id)))
      toast.success(`Moved ${ids.length} item${ids.length > 1 ? "s" : ""} to ${folder.name}`)
      selection.clear()
      invalidate()
    } catch {
      toast.error("Could not move")
    }
  }

  const trash = async (ids: string[]) => {
    if (ids.length === 0) return
    try {
      await Promise.all(ids.map((id) => trashDriveNode(id)))
      toast.success("Moved to trash")
      selection.clear()
      invalidate()
    } catch {
      toast.error("Could not delete")
    }
  }

  const copy = async (id: string) => {
    try {
      await copyDriveNode(id)
      toast.success("Copy created")
      invalidate()
    } catch {
      toast.error("Could not copy")
    }
  }

  const archive = (ids: string[]) => {
    if (!parentId || ids.length === 0) return
    upload.archive(`Archive (${ids.length} item${ids.length > 1 ? "s" : ""})`, ids, parentId)
    selection.clear()
  }

  const extract = async (id: string) => {
    try {
      await extractDriveNode(id)
      toast.success("Archive extracted")
      selection.clear()
      invalidate()
    } catch {
      toast.error("Could not extract")
    }
  }

  const uploadFiles = (files: FileList) => {
    if (parentId) upload.upload(files, { kind: "drive", parentId })
  }

  const ids = [...selection.selected]
  const selectedDeletable = ids.filter((id) => !byId.get(id)?.special)
  const single = ids.length === 1 ? byId.get(ids[0]!) : undefined
  const canExtract = single?.kind === "file" && isArchiveName(single.name)

  const actions: DriveNodeActions = {
    view: (node) => setViewingNode(node),
    download: (node) => downloadIds([node.id]),
    copyLink: (node) => {
      if (!node.downloadUrl) return
      void navigator.clipboard.writeText(node.downloadUrl)
      toast.success("Link copied")
    },
    share: (node) => setShareNode(node),
    move: (node) => setMoving([node.id]),
    copy: (node) => void copy(node.id),
    rename: (node) => setRenaming(node),
    details: (node) => {
      if (!selection.isSelected(node.id)) selection.selectOnly(node.id)
      dispatch(setDriveDetailsOpen(true))
    },
    versions: (node) => setVersionsNode(node),
    trash: (node) => void trash([node.id]),
  }

  const selectedNodes = ids
    .map((id) => byId.get(id))
    .filter((node): node is DriveNode => Boolean(node))

  const trashConfirm = useArmedConfirm(() => void trash(selectedDeletable))
  useSelectionHotkeys({
    active: selection.count > 0,
    onClear: selection.clear,
    confirm: trashConfirm,
  })

  return (
    <div className="flex flex-1">
    <DropZone className="relative flex min-w-0 flex-1 flex-col gap-4 p-6" onFiles={uploadFiles}>
      <DriveBackgroundMenu
        onUpload={() => fileInput.current?.click()}
        onNewFolder={() => setNewFolderOpen(true)}
        onNewDocument={() => void newDocument()}
      >
      <div
        className="flex flex-1 flex-col"
        onDragOver={(event) => {
          if (event.dataTransfer.types.includes(DRIVE_NODES_MIME)) event.preventDefault()
        }}
        onDrop={(event) => {
          if (!event.dataTransfer.types.includes(DRIVE_NODES_MIME)) return
          event.preventDefault()
          const raw = event.dataTransfer.getData(DRIVE_NODES_MIME)
          if (!raw || !data?.parent) return
          const dragged = (JSON.parse(raw) as string[]).filter((id) => id !== data.parent.id)
          if (dragged.length > 0) void moveInto(data.parent, dragged)
        }}
      >
        {isLoading ? (
          <PageSpinner />
        ) : visible.length === 0 && !parentFolder ? (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Icon name="folder-open" className="size-8" />
            <p className="text-sm">
              {search ? "Nothing matches your search." : "Drag files here or use Upload."}
            </p>
          </div>
        ) : viewMode === "table" ? (
          <NodeTable
            nodes={visible}
            selection={selection}
            onOpen={open}
            onDropNodes={(folder, dragged) => void moveInto(folder, dragged)}
            onSpringInto={(folder) => router.push(`/drive/${folder.id}`)}
            onParentOpen={parentHref ? () => router.push(parentHref) : undefined}
            onParentDrop={
              parentFolder ? (dragged) => void moveInto(parentFolder, dragged) : undefined
            }
            actions={actions}
          />
        ) : (
          <NodeGrid
            nodes={visible}
            selection={selection}
            onOpen={open}
            onDropNodes={(folder, dragged) => void moveInto(folder, dragged)}
            onSpringInto={(folder) => router.push(`/drive/${folder.id}`)}
            onParentOpen={parentHref ? () => router.push(parentHref) : undefined}
            onParentDrop={
              parentFolder ? (dragged) => void moveInto(parentFolder, dragged) : undefined
            }
            actions={actions}
          />
        )}
      </div>
      </DriveBackgroundMenu>

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

      <SelectionBar>
        <Button variant="ghost" size="sm" onClick={() => downloadIds(ids)}>
          <Icon name="download" className="size-4" />
          Download
        </Button>
        {single ? (
          <Button variant="ghost" size="sm" onClick={() => setRenaming(single)}>
            <IconPencil className="size-4" />
            Rename
          </Button>
        ) : null}
        {single?.kind === "file" ? (
          <Button variant="ghost" size="sm" onClick={() => setShareNode(single)}>
            <IconUserPlus className="size-4" />
            Share
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => setMoving(ids)}>
          <Icon name="folder" className="size-4" />
          Move
        </Button>
        {canExtract ? (
          <Button variant="ghost" size="sm" onClick={() => void extract(single!.id)}>
            <IconFileExport className="size-4" />
            Extract
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => archive(ids)}>
          <IconArchive className="size-4" />
          Archive
        </Button>
        <ConfirmButton
          icon={<Icon name="trash" className="size-4" />}
          armed={trashConfirm.armed}
          onTrigger={trashConfirm.trigger}
        >
          Trash
        </ConfirmButton>
      </SelectionBar>

      {parentId ? (
        <NewFolderDialog
          parentId={parentId}
          onDone={invalidate}
          open={newFolderOpen}
          onOpenChange={setNewFolderOpen}
        />
      ) : null}
      <RenameDialog
        node={renaming}
        onOpenChange={(value) => !value && setRenaming(null)}
        onDone={invalidate}
      />
      <MoveDialog
        nodeIds={moving ?? []}
        open={Boolean(moving)}
        onOpenChange={(value) => !value && setMoving(null)}
        onDone={() => {
          selection.clear()
          invalidate()
        }}
      />
      <VersionHistoryDialog
        node={versionsNode}
        open={Boolean(versionsNode)}
        onOpenChange={(value) => !value && setVersionsNode(null)}
        onDone={invalidate}
      />
      <ShareDialog
        name={shareNode?.name ?? null}
        open={Boolean(shareNode)}
        onOpenChange={(value) => !value && setShareNode(null)}
        createLink={(options) => createShareLink(shareNode!.id, options)}
      />
    </DropZone>
    <DetailsPanel
      open={detailsOpen}
      nodes={selectedNodes}
      onClose={() => dispatch(setDriveDetailsOpen(false))}
    />
    <AnimatePresence>
      {viewingNode ? (
        <ImageViewer key="viewer" node={viewingNode} onClose={() => setViewingNode(null)} />
      ) : null}
    </AnimatePresence>
    </div>
  )
}

const Browser = ({ folderId }: BrowserProps) => (
  <SelectionProvider>
    <BrowserInner folderId={folderId} />
  </SelectionProvider>
)

export default Browser
