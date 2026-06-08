"use client"

import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { sanitizeLinkHref } from "@lib/editorConfig"
import type { Editor } from "@tiptap/react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { toast } from "sonner"

const Menu = ({ label, children }: { label: string; children: ReactNode }) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      render={
        <Button variant="ghost" size="sm" className="px-2 font-normal">
          {label}
        </Button>
      }
    />
    <DropdownMenuContent align="start" className="min-w-52">
      {children}
    </DropdownMenuContent>
  </DropdownMenu>
)

interface DocMenuBarProps {
  editor: Editor
  title: string
  commentsOpen: boolean
  onToggleComments: () => void
  onAddComment: () => void
}

const DocMenuBar = ({ editor, title, commentsOpen, onToggleComments, onAddComment }: DocMenuBarProps) => {
  const router = useRouter()
  const exportDocx = async () => {
    try {
      const { exportDocument } = await import("@lib/officeExport")
      await exportDocument(editor.getHTML(), title || "Document")
    } catch {
      toast.error("Could not export")
    }
  }
  const run = (fn: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) =>
    fn(editor.chain().focus()).run()

  const insertImage = () => {
    const url = window.prompt("Image URL")
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }
  const insertLink = () => {
    const input = window.prompt("Link URL")
    if (!input) return
    const href = sanitizeLinkHref(input)
    if (href) editor.chain().focus().setLink({ href }).run()
  }
  const wordCount = () => {
    const text = editor.getText().trim()
    const words = text ? text.split(/\s+/).length : 0
    toast.info(`${words} words · ${text.length} characters`)
  }

  return (
    <div className="bg-card flex items-center gap-0.5 border-b px-1.5 py-0.5 text-sm">
      <Menu label="File">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Download</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => void exportDocx()}>
              Microsoft Word (.docx)
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => window.print()}>
          Print
          <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/docs")}>Back to Docs</DropdownMenuItem>
      </Menu>

      <Menu label="Edit">
        <DropdownMenuItem onClick={() => run((c) => c.undo())}>
          Undo
          <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((c) => c.redo())}>
          Redo
          <DropdownMenuShortcut>⌘Y</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => editor.chain().focus().selectAll().run()}>
          Select all
          <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((c) => c.unsetAllMarks().clearNodes())}>
          Clear formatting
        </DropdownMenuItem>
      </Menu>

      <Menu label="View">
        <DropdownMenuCheckboxItem checked={commentsOpen} onCheckedChange={onToggleComments}>
          Show comments
        </DropdownMenuCheckboxItem>
      </Menu>

      <Menu label="Insert">
        <DropdownMenuItem onClick={insertImage}>Image</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          Table
        </DropdownMenuItem>
        <DropdownMenuItem onClick={insertLink}>Link</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((c) => c.setHorizontalRule())}>
          Horizontal line
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAddComment}>Comment</DropdownMenuItem>
      </Menu>

      <Menu label="Format">
        <DropdownMenuItem onClick={() => run((c) => c.toggleBold())}>
          Bold
          <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((c) => c.toggleItalic())}>
          Italic
          <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((c) => c.toggleUnderline())}>
          Underline
          <DropdownMenuShortcut>⌘U</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((c) => c.toggleStrike())}>Strikethrough</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Paragraph styles</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => run((c) => c.setParagraph())}>Normal text</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.setHeading({ level: 1 }))}>Heading 1</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.setHeading({ level: 2 }))}>Heading 2</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.setHeading({ level: 3 }))}>Heading 3</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Align</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => run((c) => c.setTextAlign("left"))}>Left</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.setTextAlign("center"))}>Center</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.setTextAlign("right"))}>Right</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Lists</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => run((c) => c.toggleBulletList())}>Bulleted</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.toggleOrderedList())}>Numbered</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.toggleTaskList())}>Checklist</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => run((c) => c.unsetAllMarks().clearNodes())}>
          Clear formatting
        </DropdownMenuItem>
      </Menu>

      <Menu label="Tools">
        <DropdownMenuItem onClick={wordCount}>Word count</DropdownMenuItem>
      </Menu>

      <Menu label="Help">
        <DropdownMenuItem
          onClick={() =>
            toast.info("Shortcuts: ⌘Z undo · ⌘B/I/U format · ⌘K not bound · ⌘A select all")
          }
        >
          Keyboard shortcuts
        </DropdownMenuItem>
      </Menu>
    </div>
  )
}

export default DocMenuBar
