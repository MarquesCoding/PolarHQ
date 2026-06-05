"use client"

import type { ReactNode } from "react"
import { type Editor, useEditorState } from "@tiptap/react"
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBlockquote,
  IconBold,
  IconClearFormatting,
  IconCode,
  IconHighlight,
  IconItalic,
  IconLink,
  IconList,
  IconListCheck,
  IconListNumbers,
  IconPhoto,
  IconSourceCode,
  IconStrikethrough,
  IconTable,
  IconUnderline,
} from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"

interface ToolbarButtonProps {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}

const ToolbarButton = ({ label, active, disabled, onClick, children }: ToolbarButtonProps) => (
  <Button
    type="button"
    variant={active ? "secondary" : "ghost"}
    size="icon-sm"
    aria-label={label}
    aria-pressed={active}
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
  >
    {children}
  </Button>
)

const Divider = () => <Separator orientation="vertical" className="mx-1 h-5" />

const BLOCKS = [
  { value: "paragraph", label: "Normal text" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
]

/** Persistent Google-Docs-style formatting toolbar bound to a TipTap editor. */
const EditorToolbar = ({ editor }: { editor: Editor }) => {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      highlight: e.isActive("highlight"),
      link: e.isActive("link"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      taskList: e.isActive("taskList"),
      blockquote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      alignLeft: e.isActive({ textAlign: "left" }),
      alignCenter: e.isActive({ textAlign: "center" }),
      alignRight: e.isActive({ textAlign: "right" }),
      block: e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : "paragraph",
    }),
  })

  const setBlock = (value: string) => {
    const chain = editor.chain().focus()
    if (value === "paragraph") chain.setParagraph().run()
    else chain.setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run()
  }

  const setLink = () => {
    if (state.link) {
      editor.chain().focus().unsetLink().run()
      return
    }
    const url = window.prompt("Link URL")
    if (url) editor.chain().focus().setLink({ href: url }).run()
  }

  const addImage = () => {
    const url = window.prompt("Image URL")
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  const color = editor.getAttributes("textStyle").color ?? "#000000"

  return (
    <div className="bg-card/80 supports-[backdrop-filter]:bg-card/60 sticky top-0 z-10 flex flex-wrap items-center gap-0.5 rounded-xl border px-2 py-1.5 backdrop-blur">
      <ToolbarButton
        label="Undo"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <IconArrowBackUp className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <IconArrowForwardUp className="size-4" />
      </ToolbarButton>

      <Divider />

      <Select value={state.block} onValueChange={(value) => value && setBlock(value)}>
        <SelectTrigger className="h-8 w-36" onMouseDown={(event) => event.preventDefault()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BLOCKS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Divider />

      <ToolbarButton label="Bold" active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <IconBold className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Italic" active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <IconItalic className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <IconUnderline className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={state.strike}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <IconStrikethrough className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Inline code" active={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
        <IconCode className="size-4" />
      </ToolbarButton>

      <label
        className="hover:bg-accent flex size-8 cursor-pointer items-center justify-center rounded-md"
        aria-label="Text color"
        title="Text color"
      >
        <span className="text-sm font-semibold" style={{ color }}>
          A
        </span>
        <input
          type="color"
          value={color}
          onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
          className="sr-only"
        />
      </label>
      <ToolbarButton
        label="Highlight"
        active={state.highlight}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        <IconHighlight className="size-4" />
      </ToolbarButton>
      <ToolbarButton label="Link" active={state.link} onClick={setLink}>
        <IconLink className="size-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Align left"
        active={state.alignLeft}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <IconAlignLeft className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Align center"
        active={state.alignCenter}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <IconAlignCenter className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Align right"
        active={state.alignRight}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <IconAlignRight className="size-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Bullet list"
        active={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <IconList className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={state.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <IconListNumbers className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Task list"
        active={state.taskList}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <IconListCheck className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <IconBlockquote className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={state.codeBlock}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <IconSourceCode className="size-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton label="Insert image" onClick={addImage}>
        <IconPhoto className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Insert table"
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }
      >
        <IconTable className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Clear formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        <IconClearFormatting className="size-4" />
      </ToolbarButton>
    </div>
  )
}

export default EditorToolbar
