"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { renameDriveNode } from "@lib/drive"
import { type DocMeta, saveDocContent } from "@lib/docs"
import { Collaboration } from "@tiptap/extension-collaboration"
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

interface DocCanvasProps {
  nodeId: string
  ydoc: Y.Doc
  doc: DocMeta
}

const formatTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

/** The TipTap editing surface for a single document, bound to a (already loaded) Yjs document. */
const DocCanvas = ({ nodeId, ydoc, doc }: DocCanvasProps) => {
  const queryClient = useQueryClient()
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
