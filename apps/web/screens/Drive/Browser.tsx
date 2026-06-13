"use client"

import { useReducer, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useRouter } from "@lib/router"
import {
  type DriveListing,
  type DriveNode,
  type LibrarySource,
  copyDriveNode,
  createShareLink,
  extractDriveNode,
  createSavedSearch,
  fetchLibrary,
  fetchNodes,
  isArchiveName,
  moveDriveNode,
  setNodeFavorite,
  trashDriveNode,
} from "@polarhq/vault/drive"
import { type DocType, docTypeOf, openEditor } from "@polarhq/vault/docs"
import { downloadDriveFile } from "@polarhq/vault/driveE2e"
import { importDriveFile, officeTypeForName } from "@polarhq/vault/importFlow"
import { createEncryptedDoc } from "@polarhq/vault/e2e"
import { Icon } from "@lib/icons"
import { SelectionProvider, useSelection } from "@lib/selection"
import { useArmedConfirm } from "@lib/useArmedConfirm"
import { useSelectionHotkeys } from "@lib/useSelectionHotkeys"
import { useUploadManager } from "@lib/uploadManager"
import { useAppDispatch, useAppSelector } from "@store/hooks"
import { setDriveDetailsOpen } from "@store/uiSlice"
import {
  IconArchive,
  IconBookmark,
  IconExternalLink,
  IconFileExport,
  IconPencil,
  IconStar,
  IconStarFilled,
  IconUserPlus,
} from "@tabler/icons-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Button } from "@polarhq/ui/components/button"
import { AnimatePresence } from "motion/react"
import { toast } from "sonner"
import ConfirmButton from "@components/ConfirmButton/ConfirmButton"
import DropZone from "@components/DropZone/DropZone"
import SelectionBar from "@components/SelectionBar/SelectionBar"
import { PageSpinner } from "@components/Spinner/Spinner"
import ShareDialog from "@components/ShareDialog/ShareDialog"
import DetailsPanel from "@pages/Drive/components/DetailsPanel/DetailsPanel"
import DriveBackgroundMenu from "@pages/Drive/components/DriveBackgroundMenu/DriveBackgroundMenu"
import { dynamic } from "@lib/dynamic"
import { isFolderUnlocked } from "@polarhq/vault/folderLock"
import { is3DModelName } from "@polarhq/core/model3dExt"
import FolderLockDialog from "@pages/Drive/components/FolderLockDialog/FolderLockDialog"
import FolderLockGate from "@pages/Drive/components/FolderLockGate/FolderLockGate"
import ImageViewer from "@pages/Drive/components/ImageViewer/ImageViewer"
import MillerView from "@pages/Drive/components/MillerView/MillerView"
import MoveDialog from "@pages/Drive/components/MoveDialog/MoveDialog"
import NewFolderDialog from "@pages/Drive/components/NewFolderDialog/NewFolderDialog"
import { DRIVE_NODES_MIME } from "@pages/Drive/components/NodeCard/NodeCard"
import NodeGrid from "@pages/Drive/components/NodeGrid/NodeGrid"
import type { DriveNodeActions } from "@pages/Drive/components/NodeContextMenu/NodeContextMenu"
import NodeTable from "@pages/Drive/components/NodeTable/NodeTable"
import RenameDialog from "@pages/Drive/components/RenameDialog/RenameDialog"
import VersionHistoryDialog from "@pages/Drive/components/VersionHistoryDialog/VersionHistoryDialog"

const ModelViewer = dynamic(() => import("@pages/Drive/components/ModelViewer/ModelViewer"))

interface BrowserProps {
  folderId?: string
  source?: LibrarySource
}

const BrowserInner = ({ folderId, source }: BrowserProps) => {
  const { t } = useTranslation("drive")
  const router = useRouter()
  const queryClient = useQueryClient()
  const selection = useSelection()
  const upload = useUploadManager()
  const dispatch = useAppDispatch()
  const viewMode = useAppSelector((state) => state.ui.viewMode)
  const detailsOpen = useAppSelector((state) => state.ui.driveDetailsOpen)
  const searchRaw = useAppSelector((state) => state.ui.searchQuery).trim()
  const search = searchRaw.toLowerCase()

  const [renaming, setRenaming] = useState<DriveNode | null>(null)
  const [moving, setMoving] = useState<string[] | null>(null)
  const [versionsNode, setVersionsNode] = useState<DriveNode | null>(null)
  const [shareNode, setShareNode] = useState<DriveNode | null>(null)
  const [viewingNode, setViewingNode] = useState<DriveNode | null>(null)
  const [viewingModel, setViewingModel] = useState<DriveNode | null>(null)
  const [lockDialog, setLockDialog] = useState<{ node: DriveNode; mode: "lock" | "remove" } | null>(
    null,
  )
  const [, forceTick] = useReducer((value: number) => value + 1, 0)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const sourceKey = !source
    ? ""
    : source.view === "kind"
      ? source.kind
      : source.view === "search"
        ? source.query
        : ""
  const queryKey = source
    ? ["drive", "library", source.view, sourceKey]
    : ["drive", "nodes", folderId ?? "root"]
  const { data, isLoading } = useQuery<DriveListing | { children: DriveNode[] }>({
    queryKey,
    queryFn: () => (source ? fetchLibrary(source) : fetchNodes(folderId)),
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["drive"] })
    void queryClient.invalidateQueries({ queryKey: ["photos"] })
    void queryClient.invalidateQueries({ queryKey: ["docs"] })
  }

  const parent = data && "parent" in data ? data.parent : null
  const parentId = parent?.id ?? null
  const parentLocked = Boolean(parent?.locked) && !isFolderUnlocked(parentId ?? "")
  const children = data?.children ?? []
  const filtered = search
    ? children.filter((node) => node.name.toLowerCase().includes(search))
    : children
  const visible = source
    ? filtered
    : filtered.slice().sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1
        const rank = (node: DriveNode) => (node.special ? 0 : node.locked ? 1 : 2)
        if (rank(a) !== rank(b)) return rank(a) - rank(b)
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
      })
  const byId = new Map(children.map((node) => [node.id, node]))

  const trail = data && "breadcrumb" in data ? data.breadcrumb : []
  const parentFolder = trail.length > 1 ? trail[trail.length - 2]! : null
  const parentHref = parentFolder
    ? trail.length === 2
      ? "/drive/files"
      : `/drive/${parentFolder.id}`
    : null

  const downloadIds = (ids: string[]) => {
    for (const id of ids) {
      const node = byId.get(id)
      if (node)
        upload.downloadFile(node.name, node.sizeBytes ?? 0, (onProgress) =>
          downloadDriveFile(node, (progress) => onProgress(progress.loaded, progress.speed)),
        )
    }
  }

  const open = (node: DriveNode) => {
    if (node.kind === "folder") {
      router.push(`/drive/${node.id}`)
      return
    }
    const type = docTypeOf(node.mimeType)
    const office = officeTypeForName(node.name)
    if (type) openEditor(type, node.id, router)
    else if (office) {
      toast.info(t("browser.opening"))
      void importDriveFile(node, office, router).catch(() =>
        toast.error(t("browser.couldNotOpenFile")),
      )
    } else if (node.mimeType?.startsWith("image/")) setViewingNode(node)
    else if (is3DModelName(node.name)) setViewingModel(node)
    else downloadIds([node.id])
  }

  const newDoc = async (type: DocType) => {
    try {
      const doc = await createEncryptedDoc(parentId, type)
      invalidate()
      openEditor(type, doc.id, router)
    } catch {
      toast.error(t("browser.couldNotCreate"))
    }
  }

  const moveInto = async (folder: DriveNode, ids: string[]) => {
    const toMove = ids.filter((id) => byId.get(id)?.parentId !== folder.id)
    if (toMove.length === 0) return
    try {
      await Promise.all(toMove.map((id) => moveDriveNode(id, folder.id)))
      toast.success(t("browser.movedToFolder", { count: toMove.length, name: folder.name }))
      selection.clear()
      invalidate()
    } catch {
      toast.error(t("browser.couldNotMove"))
    }
  }

  const trash = async (ids: string[]) => {
    if (ids.length === 0) return
    try {
      await Promise.all(ids.map((id) => trashDriveNode(id)))
      toast.success(t("browser.movedToTrash"))
      selection.clear()
      invalidate()
    } catch {
      toast.error(t("browser.couldNotDelete"))
    }
  }

  const copy = async (id: string) => {
    try {
      await copyDriveNode(id)
      toast.success(t("browser.copyCreated"))
      invalidate()
    } catch {
      toast.error(t("browser.couldNotCopy"))
    }
  }

  const toggleFavorite = async (node: DriveNode) => {
    const next = !node.favorite
    try {
      await setNodeFavorite(node.id, next)
      toast.success(next ? t("browser.favorited") : t("browser.unfavorited"))
      invalidate()
    } catch {
      toast.error(t("browser.couldNotFavorite"))
    }
  }

  const saveSearch = async () => {
    if (!searchRaw) return
    try {
      await createSavedSearch(searchRaw)
      void queryClient.invalidateQueries({ queryKey: ["drive", "searches"] })
      toast.success(t("browser.searchSaved"))
    } catch {
      toast.error(t("browser.couldNotSaveSearch"))
    }
  }

  const archive = (ids: string[]) => {
    if (!parentId || ids.length === 0) return
    upload.archive(t("browser.archiveLabel", { count: ids.length }), ids, parentId)
    selection.clear()
  }

  const extract = async (id: string) => {
    try {
      await extractDriveNode(id)
      toast.success(t("browser.archiveExtracted"))
      selection.clear()
      invalidate()
    } catch {
      toast.error(t("browser.couldNotExtract"))
    }
  }

  const uploadFiles = (files: FileList) => {
    if (parentId) upload.upload(files, { kind: "drive", parentId })
  }

  const ids = [...selection.selected]
  const selectedDeletable = ids.filter((id) => !byId.get(id)?.special)
  const hasSpecial = ids.some((id) => byId.get(id)?.special)
  const single = ids.length === 1 ? byId.get(ids[0]!) : undefined
  const canExtract = single?.kind === "file" && isArchiveName(single.name)

  const actions: DriveNodeActions = {
    open: (node) => open(node),
    view: (node) => (is3DModelName(node.name) ? setViewingModel(node) : setViewingNode(node)),
    download: (node) => downloadIds([node.id]),
    copyLink: (node) => {
      if (!node.downloadUrl) return
      void navigator.clipboard.writeText(node.downloadUrl)
      toast.success(t("browser.linkCopied"))
    },
    share: (node) => setShareNode(node),
    move: (node) => setMoving([node.id]),
    copy: (node) => void copy(node.id),
    extract: (node) => void extract(node.id),
    lock: (node) => setLockDialog({ node, mode: "lock" }),
    removeLock: (node) => setLockDialog({ node, mode: "remove" }),
    favorite: (node) => void toggleFavorite(node),
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
    onSelectAll: () => selection.selectAll(children.map((node) => node.id)),
  })

  return (
    <div className="flex flex-1">
    <DropZone className="relative flex min-w-0 flex-1 flex-col gap-4 p-6" onFiles={uploadFiles}>
      <DriveBackgroundMenu
        onUpload={() => fileInput.current?.click()}
        onNewFolder={() => setNewFolderOpen(true)}
        onNew={(type) => void newDoc(type)}
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
          if (!raw || !parent) return
          const dragged = (JSON.parse(raw) as string[]).filter((id) => id !== parent.id)
          if (dragged.length > 0) void moveInto(parent, dragged)
        }}
      >
        {search && !source ? (
          <div className="border-border/60 mb-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-sm">
            <span className="text-muted-foreground min-w-0 truncate">
              {t("browser.resultsFor", { query: searchRaw })}
            </span>
            <Button variant="ghost" size="sm" onClick={() => void saveSearch()}>
              <IconBookmark className="size-4" />
              {t("browser.saveSearch")}
            </Button>
          </div>
        ) : null}
        {isLoading ? (
          <PageSpinner />
        ) : parentLocked && parent ? (
          <FolderLockGate node={parent} onUnlocked={forceTick} />
        ) : visible.length === 0 && !parentFolder ? (
          <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Icon name="folder-open" className="size-8" />
            <p className="text-sm">
              {search
                ? t("browser.noMatches")
                : source
                  ? t("browser.libraryEmpty")
                  : t("browser.dragOrUpload")}
            </p>
          </div>
        ) : viewMode === "columns" && !source ? (
          <MillerView
            rootFolderId={folderId}
            selection={selection}
            onOpen={open}
            actions={actions}
          />
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
        {single && docTypeOf(single.mimeType) ? (
          <Button variant="ghost" size="sm" onClick={() => open(single)}>
            <IconExternalLink className="size-4" />
            {t("browser.open")}
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => downloadIds(ids)}>
          <Icon name="download" className="size-4" />
          {t("browser.download")}
        </Button>
        {single && !single.special ? (
          <Button variant="ghost" size="sm" onClick={() => void toggleFavorite(single)}>
            {single.favorite ? (
              <IconStarFilled className="size-4" />
            ) : (
              <IconStar className="size-4" />
            )}
            {single.favorite ? t("browser.unfavorite") : t("browser.favorite")}
          </Button>
        ) : null}
        {single && !single.special ? (
          <Button variant="ghost" size="sm" onClick={() => setRenaming(single)}>
            <IconPencil className="size-4" />
            {t("browser.rename")}
          </Button>
        ) : null}
        {single?.kind === "file" ? (
          <Button variant="ghost" size="sm" onClick={() => setShareNode(single)}>
            <IconUserPlus className="size-4" />
            {t("browser.share")}
          </Button>
        ) : null}
        {hasSpecial ? null : (
          <Button variant="ghost" size="sm" onClick={() => setMoving(ids)}>
            <Icon name="folder" className="size-4" />
            {t("browser.move")}
          </Button>
        )}
        {canExtract ? (
          <Button variant="ghost" size="sm" onClick={() => void extract(single!.id)}>
            <IconFileExport className="size-4" />
            {t("browser.extract")}
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={() => archive(ids)}>
          <IconArchive className="size-4" />
          {t("browser.archive")}
        </Button>
        {hasSpecial ? null : (
          <ConfirmButton
            icon={<Icon name="trash" className="size-4" />}
            armed={trashConfirm.armed}
            onTrigger={trashConfirm.trigger}
          >
            {t("browser.trash")}
          </ConfirmButton>
        )}
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
        encryptKeyId={shareNode?.encrypted ? shareNode.id : undefined}
      />
      <FolderLockDialog
        node={lockDialog?.node ?? null}
        mode={lockDialog?.mode ?? "lock"}
        open={Boolean(lockDialog)}
        onOpenChange={(value) => !value && setLockDialog(null)}
        onDone={invalidate}
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
      {viewingModel ? (
        <ModelViewer key="model" node={viewingModel} onClose={() => setViewingModel(null)} />
      ) : null}
    </AnimatePresence>
    </div>
  )
}

const Browser = ({ folderId, source }: BrowserProps) => (
  <SelectionProvider>
    <BrowserInner folderId={folderId} source={source} />
  </SelectionProvider>
)

export default Browser
