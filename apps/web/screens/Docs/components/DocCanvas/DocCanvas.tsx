"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { authClient } from "@lib/authClient"
import { renameDriveNode } from "@lib/drive"
import { type DocMeta, saveDocContent } from "@lib/docs"
import type { RelayProvider } from "@lib/yjsProvider"
import { Collaboration } from "@tiptap/extension-collaboration"
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret"
import { Color } from "@tiptap/extension-color"
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
import { IconDeviceFloppy } from "@tabler/icons-react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import * as Y from "yjs"
import EditorToolbar from "@pages/Docs/components/EditorToolbar/EditorToolbar"

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

/** The TipTap editing surface for a single document, bound to a (already loaded) Yjs document. */
const DocCanvas = ({ nodeId, ydoc, doc, provider }: DocCanvasProps) => {
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const [me] = useState<CollaboratorIdentity>(() => ({
    name: session?.user?.name || "Anonymous",
    color: colorFor(session?.user?.id || session?.user?.email || "anon"),
  }))
  const [peers, setPeers] = useState<CollaboratorIdentity[]>([])
  const [title, setTitle] = useState(doc.name)
  const [saveState, setSaveState] = useState<SaveState>("saved")
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() =>
    doc.updatedAt ? new Date(doc.updatedAt).getTime() : null,
  )
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dirtyRef = useRef(false)

  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current)
    if (!dirtyRef.current) return
    dirtyRef.current = false
    setSaveState("saving")
    try {
      await saveDocContent(nodeId, Y.encodeStateAsUpdate(ydoc))
      setLastSavedAt(Date.now())
      setSaveState("saved")
    } catch {
      dirtyRef.current = true
      setSaveState("dirty")
    }
  }, [nodeId, ydoc])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ undoRedo: false, link: { openOnClick: false } }),
      TextStyle,
      Color,
      Highlight,
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
      CollaborationCaret.configure({ provider, user: me }),
    ],
    editorProps: {
      attributes: { class: "doc-editor min-h-[60vh] max-w-[800px]" },
    },
  })

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
      // flush any pending edits and refresh list ordering when leaving the editor
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
    void renameDriveNode(nodeId, next).then(() =>
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
    <div className="flex min-h-full flex-1 flex-col gap-3 p-4">
      <div className="mx-auto flex w-full max-w-[840px] items-center gap-3">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={commitTitle}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          aria-label="Document title"
          className="h-auto border-none bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
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
        <div className="mx-auto w-full max-w-[840px]">
          <EditorToolbar editor={editor} />
        </div>
      ) : null}

      <div
        className="mx-auto w-full max-w-[840px] flex-1 cursor-text"
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default DocCanvas
