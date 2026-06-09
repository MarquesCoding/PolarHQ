"use client"

import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { authClient } from "@lib/authClient"
import type { CollabDocument } from "@lib/useCollabDocument"
import {
  IconBlockquote,
  IconCode,
  IconH1,
  IconH2,
  IconH3,
  IconLetterT,
  IconList,
  IconListCheck,
  IconListNumbers,
  IconMinus,
  IconPhoto,
} from "@tabler/icons-react"
import type { Editor } from "@tiptap/core"
import { Collaboration } from "@tiptap/extension-collaboration"
import { CollaborationCaret } from "@tiptap/extension-collaboration-caret"
import { Image } from "@tiptap/extension-image"
import { Placeholder } from "@tiptap/extension-placeholder"
import { TaskItem } from "@tiptap/extension-task-item"
import { TaskList } from "@tiptap/extension-task-list"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import type * as Y from "yjs"

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

interface SlashItem {
  title: string
  keywords: string
  icon: (props: { className?: string }) => ReactNode
  run: (editor: Editor) => void
}

const SLASH_ITEMS: SlashItem[] = [
  {
    title: "Text",
    keywords: "paragraph plain",
    icon: (p) => <IconLetterT {...p} />,
    run: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    title: "Heading 1",
    keywords: "h1 title big",
    icon: (p) => <IconH1 {...p} />,
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    keywords: "h2 subtitle",
    icon: (p) => <IconH2 {...p} />,
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    keywords: "h3",
    icon: (p) => <IconH3 {...p} />,
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bulleted list",
    keywords: "unordered ul bullet",
    icon: (p) => <IconList {...p} />,
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    keywords: "ordered ol number",
    icon: (p) => <IconListNumbers {...p} />,
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "To-do list",
    keywords: "task checkbox check",
    icon: (p) => <IconListCheck {...p} />,
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Quote",
    keywords: "blockquote cite",
    icon: (p) => <IconBlockquote {...p} />,
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Code",
    keywords: "codeblock pre",
    icon: (p) => <IconCode {...p} />,
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Divider",
    keywords: "hr rule separator line",
    icon: (p) => <IconMinus {...p} />,
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Image",
    keywords: "picture photo img",
    icon: (p) => <IconPhoto {...p} />,
    run: (e) => {
      const url = window.prompt("Image URL")
      if (url) e.chain().focus().setImage({ src: url }).run()
    },
  },
]

interface SlashState {
  query: string
  left: number
  top: number
}

interface BlockEditorProps {
  ydoc: Y.Doc
  provider: NonNullable<CollabDocument["provider"]>
  /** The Yjs fragment to bind to (defaults to the document body). */
  field?: string
  placeholder?: string
  /** Extra classes for the editable area (e.g. min-height). */
  className?: string
}

/** A collaborative, block-based TipTap editor with a Notion-style slash command menu and
 *  Markdown shortcuts. Binds to a named Yjs fragment so notes and database rows can each
 *  hold their own block content inside one document. */
const BlockEditor = ({ ydoc, provider, field, placeholder, className }: BlockEditorProps) => {
  const { data: session } = authClient.useSession()

  const [slash, setSlash] = useState<SlashState | null>(null)
  const [index, setIndex] = useState(0)

  const filtered = slash
    ? SLASH_ITEMS.filter((item) => {
        const q = slash.query.toLowerCase()
        return !q || item.title.toLowerCase().includes(q) || item.keywords.includes(q)
      })
    : []
  const activeIndex = Math.min(index, Math.max(0, filtered.length - 1))

  const live = useRef<{ slash: SlashState | null; filtered: SlashItem[]; index: number }>({
    slash: null,
    filtered: [],
    index: 0,
  })
  useEffect(() => {
    live.current = { slash, filtered, index: activeIndex }
  })

  const syncSlash = (editor: Editor) => {
    const sel = editor.state.selection
    if (!sel.empty) {
      setSlash(null)
      return
    }
    const textBefore = sel.$from.parent.textBetween(0, sel.$from.parentOffset, undefined, "￼")
    const match = textBefore.match(/(?:^|\s)\/(\w*)$/)
    if (!match) {
      setSlash(null)
      return
    }
    const coords = editor.view.coordsAtPos(sel.from)
    setSlash({ query: match[1] ?? "", left: coords.left, top: coords.bottom + 4 })
    setIndex(0)
  }

  const choose = (editor: Editor, item: SlashItem) => {
    const to = editor.state.selection.from
    const from = to - (live.current.slash?.query.length ?? 0) - 1
    editor.chain().focus().deleteRange({ from, to }).run()
    item.run(editor)
    setSlash(null)
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: ydoc, field }),
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
        placeholder: placeholder ?? "Type ‘/’ for commands, or just start writing…",
      }),
    ],
    editorProps: {
      attributes: { class: cn("doc-editor focus:outline-none", className) },
      handleKeyDown: (_view, event) => {
        if (!live.current.slash) return false
        const items = live.current.filtered
        if (event.key === "ArrowDown") {
          setIndex((i) => (items.length ? (i + 1) % items.length : 0))
          return true
        }
        if (event.key === "ArrowUp") {
          setIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0))
          return true
        }
        if (event.key === "Enter") {
          const item = items[live.current.index]
          if (item && editor) choose(editor, item)
          return true
        }
        if (event.key === "Escape") {
          setSlash(null)
          return true
        }
        return false
      },
    },
    onUpdate: ({ editor: instance }) => syncSlash(instance),
    onSelectionUpdate: ({ editor: instance }) => syncSlash(instance),
  })

  return (
    <>
      <EditorContent editor={editor} />

      {slash && filtered.length > 0 ? (
        <div
          className="bg-popover fixed z-[60] max-h-72 w-64 overflow-y-auto rounded-lg border p-1 shadow-lg"
          style={{ left: slash.left, top: slash.top }}
        >
          {filtered.map((item, i) => (
            <Button
              key={item.title}
              variant="ghost"
              onMouseDown={(event) => {
                event.preventDefault()
                if (editor) choose(editor, item)
              }}
              className={cn(
                "h-auto w-full justify-start gap-2.5 px-2 py-1.5 font-normal",
                i === activeIndex && "bg-accent",
              )}
            >
              <span className="bg-muted text-muted-foreground flex size-7 shrink-0 items-center justify-center rounded-md">
                <item.icon className="size-4" />
              </span>
              {item.title}
            </Button>
          ))}
        </div>
      ) : null}
    </>
  )
}

export default BlockEditor
