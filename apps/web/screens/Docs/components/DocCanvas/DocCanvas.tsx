"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { authClient } from "@lib/authClient"
import {
  CommentMark,
  type CommentThread,
  type DocComment,
  findThreadRange,
} from "@lib/commentMark"
import { secretboxSeal } from "@lib/crypto"
import { renameDriveNode } from "@lib/drive"
import { FontSize, Indent, LineHeight } from "@lib/docExtensions"
import { safeLinkOptions } from "@lib/editorConfig"
import { type DocMeta, saveDocContent } from "@lib/docs"
import { encryptNameWith } from "@lib/e2e"
import { imageFilesFrom, insertImageFiles } from "@lib/editorImages"
import { applyImportName, takeImport } from "@lib/importFlow"
import type { RelayProvider } from "@lib/yjsProvider"
import { Collaboration } from "@tiptap/extension-collaboration"
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret"
import { Color } from "@tiptap/extension-color"
import { FontFamily } from "@tiptap/extension-font-family"
import { Highlight } from "@tiptap/extension-highlight"
import { Image } from "@tiptap/extension-image"
import { Placeholder } from "@tiptap/extension-placeholder"
import { TaskItem } from "@tiptap/extension-task-item"
import { TaskList } from "@tiptap/extension-task-list"
import { Table } from "@tiptap/extension-table"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableRow } from "@tiptap/extension-table-row"
import { TextAlign } from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  IconDeviceFloppy,
  IconFileText,
  IconMessage,
  IconMessagePlus,
  IconUserPlus,
} from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import * as Y from "yjs"
import EncryptedBadge from "@components/EncryptedBadge/EncryptedBadge"
import CommentsPanel from "@pages/Docs/components/CommentsPanel/CommentsPanel"
import DocMenuBar from "@pages/Docs/components/DocMenuBar/DocMenuBar"
import EditorToolbar from "@pages/Docs/components/EditorToolbar/EditorToolbar"
import ShareDocDialog from "@pages/Docs/components/ShareDocDialog/ShareDocDialog"

type SaveState = "saved" | "saving" | "dirty"

interface CollaboratorIdentity {
  name: string
  color: string
}

interface DocCanvasProps {
  nodeId: string
  ydoc: Y.Doc
  doc: DocMeta
  provider: RelayProvider
  contentKey: Uint8Array | null
}

const formatTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

const CARET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
]

/** Stable color per user so a person's caret/badge looks the same to everyone. */
const colorFor = (seed: string): string => {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return CARET_COLORS[Math.abs(hash) % CARET_COLORS.length]!
}

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?"

const withAlpha = (hex: string, alpha: number): string => {
  const value = hex.replace("#", "")
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** A thin colored caret with a floating name badge above it (Google-Docs style). */
const buildCaret = (user: Record<string, unknown>): HTMLElement => {
  const color = typeof user.color === "string" ? user.color : "#3b82f6"
  const name = typeof user.name === "string" ? user.name : "Anonymous"
  const caret = document.createElement("span")
  caret.className = "doc-caret"
  caret.style.borderColor = color
  const label = document.createElement("span")
  label.className = "doc-caret__label"
  label.style.backgroundColor = color
  label.textContent = name
  caret.appendChild(label)
  return caret
}

/** The TipTap editing surface for a single document, bound to a (already loaded) Yjs document. */
const DocCanvas = ({ nodeId, ydoc, doc, provider, contentKey }: DocCanvasProps) => {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const [me] = useState<CollaboratorIdentity>(() => ({
    name: session?.user?.name || "Anonymous",
    color: colorFor(session?.user?.id || session?.user?.email || "anon"),
  }))
  const [peers, setPeers] = useState<CollaboratorIdentity[]>([])
  const [shareOpen, setShareOpen] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [activeThread, setActiveThread] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ threadId: string; range: { from: number; to: number } } | null>(
    null,
  )
  const [threads, setThreads] = useState<CommentThread[]>([])
  const [comments, setComments] = useState<DocComment[]>([])
  const [title, setTitle] = useState(doc.name)
  const [saveState, setSaveState] = useState<SaveState>("saved")
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() =>
    doc.updatedAt ? new Date(doc.updatedAt).getTime() : null,
  )
  const [zoom, setZoom] = useState(100)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dirtyRef = useRef(false)

  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current)
    if (!dirtyRef.current) return
    dirtyRef.current = false
    setSaveState("saving")
    try {
      let bytes = Y.encodeStateAsUpdate(ydoc)
      if (contentKey) bytes = secretboxSeal(bytes, contentKey)
      await saveDocContent(nodeId, bytes)
      setLastSavedAt(Date.now())
      setSaveState("saved")
    } catch {
      dirtyRef.current = true
      setSaveState("dirty")
    }
  }, [nodeId, ydoc, contentKey])

  const editor = useEditor({
    immediatelyRender: false,
    onSelectionUpdate: ({ editor: instance }) => setHasSelection(!instance.state.selection.empty),
    extensions: [
      StarterKit.configure({ undoRedo: false, link: safeLinkOptions }),
      CommentMark,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Indent,
      LineHeight,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
      Placeholder.configure({ placeholder: "Write something…" }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Collaboration.configure({ document: ydoc }),
      CollaborationCaret.configure({
        provider,
        user: me,
        render: buildCaret,
        selectionRender: (user: Record<string, unknown>) => ({
          nodeName: "span",
          class: "doc-caret__selection",
          style: `background-color: ${withAlpha(
            typeof user.color === "string" ? user.color : "#3b82f6",
            0.28,
          )}`,
        }),
      }),
    ],
    editorProps: {
      attributes: { class: "doc-editor min-h-[60vh] max-w-[800px]" },
      handleClick: (view, pos) => {
        const mark = view.state.doc
          .resolve(pos)
          .marks()
          .find((candidate) => candidate.type.name === "comment")
        const threadId = mark?.attrs.threadId as string | undefined
        if (threadId) {
          setActiveThread(threadId)
          setCommentsOpen(true)
        }
        return false
      },
      handlePaste: (view, event) => {
        const files = imageFilesFrom(event.clipboardData)
        if (files.length === 0) return false
        void insertImageFiles(view, files)
        return true
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false
        const files = imageFilesFrom(event.dataTransfer)
        if (files.length === 0) return false
        event.preventDefault()
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        void insertImageFiles(view, files, pos)
        return true
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    const payload = takeImport(nodeId)
    if (!payload || payload.kind !== "doc" || !editor.isEmpty) return
    editor.commands.setContent(payload.html)
    applyImportName(nodeId, payload.name, contentKey)
  }, [editor, nodeId, contentKey])

  useEffect(() => {
    const onUpdate = () => {
      dirtyRef.current = true
      setSaveState("dirty")
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => void flush(), 800)
    }
    ydoc.on("update", onUpdate)
    return () => {
      ydoc.off("update", onUpdate)
      clearTimeout(saveTimer.current)
      void flush().finally(() => queryClient.invalidateQueries({ queryKey: ["docs"] }))
    }
  }, [ydoc, flush, queryClient])

  useEffect(() => {
    const update = () => {
      const others: CollaboratorIdentity[] = []
      provider.awareness.getStates().forEach((state, clientId) => {
        const user = (state as { user?: CollaboratorIdentity }).user
        if (clientId !== ydoc.clientID && user?.name) others.push(user)
      })
      setPeers(others)
    }
    provider.awareness.on("change", update)
    update()
    return () => provider.awareness.off("change", update)
  }, [provider, ydoc])

  useEffect(() => {
    const threadsMap = ydoc.getMap("docThreads")
    const commentsArr = ydoc.getArray("docComments")
    const sync = () => {
      const next: CommentThread[] = []
      threadsMap.forEach((value) => next.push(value as CommentThread))
      setThreads(next)
      setComments(commentsArr.toArray() as DocComment[])
    }
    threadsMap.observe(sync)
    commentsArr.observe(sync)
    sync()
    return () => {
      threadsMap.unobserve(sync)
      commentsArr.unobserve(sync)
    }
  }, [ydoc])

  const pushComment = (threadId: string, body: string) => {
    ydoc.getArray("docComments").push([
      {
        id: crypto.randomUUID(),
        threadId,
        authorName: me.name,
        authorColor: me.color,
        body,
        createdAt: Date.now(),
      } satisfies DocComment,
    ])
  }

  const addComment = () => {
    if (!editor || editor.state.selection.empty) return
    const { from, to } = editor.state.selection
    setDraft({ threadId: crypto.randomUUID(), range: { from, to } })
    setCommentsOpen(true)
  }

  const submitNewComment = (body: string) => {
    if (!editor || !draft) return
    const { threadId, range } = draft
    editor
      .chain()
      .focus()
      .setTextSelection(range)
      .setMark("comment", { threadId })
      .setTextSelection(range.to)
      .run()
    ydoc
      .getMap("docThreads")
      .set(threadId, { id: threadId, resolved: false, createdAt: Date.now() } satisfies CommentThread)
    pushComment(threadId, body)
    setDraft(null)
    setActiveThread(threadId)
  }

  const resolveThread = (threadId: string) => {
    ydoc
      .getMap("docThreads")
      .set(threadId, { id: threadId, resolved: true, createdAt: Date.now() } satisfies CommentThread)
    if (editor) {
      const range = findThreadRange(editor, threadId)
      if (range) {
        editor.chain().setTextSelection(range).unsetMark("comment").setTextSelection(range.from).run()
      }
    }
    if (activeThread === threadId) setActiveThread(null)
  }

  const selectThread = (threadId: string) => {
    setActiveThread(threadId)
    if (editor) {
      const range = findThreadRange(editor, threadId)
      if (range) editor.chain().setTextSelection(range).scrollIntoView().run()
    }
  }

  const openThreadCount = threads.filter((thread) => !thread.resolved).length

  const manualSave = async () => {
    dirtyRef.current = true
    await flush()
    void queryClient.invalidateQueries({ queryKey: ["docs"] })
  }

  const commitTitle = () => {
    const next = title.trim()
    if (!next || next === doc.name) {
      setTitle(doc.name)
      return
    }
    const sharedName = contentKey ? encryptNameWith(next, contentKey) : null
    void renameDriveNode(nodeId, next, sharedName).then(() =>
      queryClient.invalidateQueries({ queryKey: ["docs"] }),
    )
  }

  const status =
    saveState === "saving"
      ? "Saving…"
      : lastSavedAt
        ? `Saved ${formatTime(lastSavedAt)}`
        : "Not saved yet"

  return (
    <div className="bg-background flex h-svh flex-col overflow-hidden">
      <header className="bg-card flex flex-col gap-0.5 border-b px-3 pt-2">
        <div className="flex items-center gap-2">
          <Link
            href="/docs"
            aria-label="Back to Docs"
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-blue-600/15 text-blue-600 dark:text-blue-400"
          >
            <IconFileText className="size-5" />
          </Link>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            aria-label="Document title"
            className="h-auto w-auto min-w-0 flex-1 border-none bg-transparent px-0 py-0 text-base font-medium shadow-none focus-visible:ring-0"
          />
          {peers.length > 0 ? (
            <div className="flex shrink-0 -space-x-1.5">
              {peers.slice(0, 4).map((peer, index) => (
                <span
                  key={`${peer.name}-${index}`}
                  title={peer.name}
                  style={{ backgroundColor: peer.color }}
                  className="border-background flex size-6 items-center justify-center rounded-full border-2 text-[0.6rem] font-semibold text-white"
                >
                  {initials(peer.name)}
                </span>
              ))}
              {peers.length > 4 ? (
                <span className="border-background bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full border-2 text-[0.6rem] font-semibold">
                  +{peers.length - 4}
                </span>
              ) : null}
            </div>
          ) : null}
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{status}</span>
          {contentKey ? <EncryptedBadge /> : null}
          {hasSelection ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Add comment"
              title="Add comment"
              onClick={addComment}
            >
              <IconMessagePlus className="size-4" />
            </Button>
          ) : null}
          <Button
            variant={commentsOpen ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setCommentsOpen((value) => !value)}
          >
            <IconMessage className="size-4" />
            {openThreadCount > 0 ? openThreadCount : "Comments"}
          </Button>
          {doc.owner ? (
            <Button size="sm" onClick={() => setShareOpen(true)}>
              <IconUserPlus className="size-4" />
              Share
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            disabled={saveState === "saving"}
            onClick={() => void manualSave()}
          >
            <IconDeviceFloppy className="size-4" />
            Save
          </Button>
        </div>
        {editor ? (
          <DocMenuBar
            editor={editor}
            title={title}
            commentsOpen={commentsOpen}
            onToggleComments={() => setCommentsOpen((value) => !value)}
            onAddComment={addComment}
          />
        ) : null}
      </header>

      {editor ? (
        <div className="bg-card/40 flex justify-center border-b px-3 py-1.5">
          <div className="w-full max-w-[980px]">
            <EditorToolbar editor={editor} zoom={zoom} onZoomChange={setZoom} />
          </div>
        </div>
      ) : null}

      <ShareDocDialog nodeId={nodeId} name={doc.name} open={shareOpen} onOpenChange={setShareOpen} />

      <div className="bg-muted/30 flex min-h-0 flex-1">
        <div className="scrollbar-slim min-w-0 flex-1 overflow-auto py-8">
          <div
            className="bg-card mx-auto w-full max-w-[850px] cursor-text rounded-sm border px-16 py-14 shadow-lg"
            style={{ zoom: zoom / 100 }}
            onClick={() => editor?.chain().focus().run()}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
        {commentsOpen ? (
          <div className="bg-card w-80 shrink-0 overflow-auto border-l">
            <CommentsPanel
              threads={threads}
              comments={comments}
              activeThread={activeThread}
              draft={draft}
              onClose={() => setCommentsOpen(false)}
              onSelectThread={selectThread}
              onSubmitNew={submitNewComment}
              onReply={pushComment}
              onResolve={resolveThread}
              onCancelDraft={() => setDraft(null)}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default DocCanvas
