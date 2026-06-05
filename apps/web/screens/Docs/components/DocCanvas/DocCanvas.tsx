"use client"

import { useEffect, useRef, useState } from "react"
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
import { Input } from "@workspace/ui/components/input"
import * as Y from "yjs"
import EditorToolbar from "@pages/Docs/components/EditorToolbar/EditorToolbar"

type SaveState = "saved" | "saving"

interface DocCanvasProps {
  nodeId: string
  ydoc: Y.Doc
  doc: DocMeta
}

/** The TipTap editing surface for a single document, bound to a (already loaded) Yjs document. */
const DocCanvas = ({ nodeId, ydoc, doc }: DocCanvasProps) => {
  const [title, setTitle] = useState(doc.name)
  const [saveState, setSaveState] = useState<SaveState>("saved")
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

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
    const persist = () => {
      clearTimeout(saveTimer.current)
      setSaveState("saving")
      saveTimer.current = setTimeout(() => {
        void saveDocContent(nodeId, Y.encodeStateAsUpdate(ydoc))
          .then(() => setSaveState("saved"))
          .catch(() => setSaveState("saved"))
      }, 800)
    }
    ydoc.on("update", persist)
    return () => {
      ydoc.off("update", persist)
      clearTimeout(saveTimer.current)
    }
  }, [ydoc, nodeId])

  const commitTitle = () => {
    const next = title.trim()
    if (!next || next === doc.name) {
      setTitle(doc.name)
      return
    }
    void renameDriveNode(nodeId, next)
  }

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
        <span className="text-muted-foreground shrink-0 text-xs">
          {saveState === "saving" ? "Saving…" : "Saved"}
        </span>
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
