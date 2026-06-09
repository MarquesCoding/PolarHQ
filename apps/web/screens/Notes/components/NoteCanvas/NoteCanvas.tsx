"use client"

import { authClient } from "@lib/authClient"
import type { CollabDocument } from "@lib/useCollabDocument"
import { Collaboration } from "@tiptap/extension-collaboration"
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret"
import { Image } from "@tiptap/extension-image"
import { Placeholder } from "@tiptap/extension-placeholder"
import { TaskItem } from "@tiptap/extension-task-item"
import { TaskList } from "@tiptap/extension-task-list"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

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
const colorFor = (seed: string): string => {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return CARET_COLORS[Math.abs(hash) % CARET_COLORS.length]!
}

/** The collaborative, block-based note editor (TipTap + Yjs, E2E via the relay). */
const NoteCanvas = ({ collab }: { collab: CollabDocument }) => {
  const { ydoc } = collab
  const provider = collab.provider!
  const { data: session } = authClient.useSession()

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc }),
      CollaborationCaret.configure({
        provider,
        user: {
          name: session?.user?.name || "Anonymous",
          color: colorFor(session?.user?.id || session?.user?.email || "anon"),
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image,
      Placeholder.configure({
        placeholder: "Start writing, or use Markdown shortcuts like # , - , [] , > …",
      }),
    ],
    editorProps: {
      attributes: { class: "doc-editor min-h-[50vh] focus:outline-none" },
    },
  })

  return (
    <div className="scrollbar-slim flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-8 py-10">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default NoteCanvas
