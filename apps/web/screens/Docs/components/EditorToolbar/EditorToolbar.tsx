"use client"

import { type ReactNode, useRef } from "react"
import { useTranslation } from "react-i18next"
import { sanitizeLinkHref } from "@lib/editorConfig"
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
  IconIndentDecrease,
  IconIndentIncrease,
  IconItalic,
  IconLineHeight,
  IconLink,
  IconList,
  IconListCheck,
  IconListNumbers,
  IconMinus,
  IconPhoto,
  IconPlus,
  IconPrinter,
  IconSourceCode,
  IconStrikethrough,
  IconTable,
  IconUnderline,
} from "@tabler/icons-react"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
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

const FONTS = ["Default", "Arial", "Georgia", "Times New Roman", "Courier New", "Verdana", "Roboto"]
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72]
const ZOOMS = [50, 75, 90, 100, 125, 150, 200]

interface EditorToolbarProps {
  editor: Editor
  zoom?: number
  onZoomChange?: (zoom: number) => void
}

/** Persistent Google-Docs-style formatting toolbar bound to a TipTap editor. */
const EditorToolbar = ({ editor, zoom, onZoomChange }: EditorToolbarProps) => {
  const { t } = useTranslation("docs")
  const BLOCKS = [
    { value: "paragraph", label: t("editorToolbar.normalText") },
    { value: "h1", label: t("editorToolbar.heading1") },
    { value: "h2", label: t("editorToolbar.heading2") },
    { value: "h3", label: t("editorToolbar.heading3") },
  ]
  const LINE_SPACINGS = [
    { label: t("editorToolbar.single"), value: "1" },
    { label: "1.15", value: "1.15" },
    { label: "1.5", value: "1.5" },
    { label: t("editorToolbar.double"), value: "2" },
  ]
  const colorInput = useRef<HTMLInputElement>(null)
  const highlightInput = useRef<HTMLInputElement>(null)
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
      fontFamily: (e.getAttributes("textStyle").fontFamily as string | undefined) ?? "Default",
      fontSize: (e.getAttributes("textStyle").fontSize as string | undefined) ?? "",
      color: (e.getAttributes("textStyle").color as string | undefined) ?? "#000000",
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
    const input = window.prompt(t("editorToolbar.linkUrl"))
    if (!input) return
    const href = sanitizeLinkHref(input)
    if (href) editor.chain().focus().setLink({ href }).run()
  }

  const addImage = () => {
    const url = window.prompt(t("editorToolbar.imageUrl"))
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }

  const currentSize = state.fontSize ? parseInt(state.fontSize, 10) : 11
  const setSize = (size: number) =>
    editor.chain().focus().setFontSize(`${Math.min(400, Math.max(1, size))}px`).run()

  return (
    <div className="bg-card/80 supports-[backdrop-filter]:bg-card/60 flex flex-wrap items-center gap-0.5 rounded-full border px-2 py-1 backdrop-blur">
      <ToolbarButton label={t("editorToolbar.undo")} disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <IconArrowBackUp className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.redo")} disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <IconArrowForwardUp className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.print")} onClick={() => window.print()}>
        <IconPrinter className="size-4" />
      </ToolbarButton>

      {onZoomChange ? (
        <>
          <Divider />
          <Select value={String(zoom ?? 100)} onValueChange={(value) => value && onZoomChange(Number(value))}>
            <SelectTrigger size="sm" className="w-[68px]" onMouseDown={(event) => event.preventDefault()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ZOOMS.map((level) => (
                <SelectItem key={level} value={String(level)}>
                  {level}%
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      ) : null}

      <Divider />

      <Select value={state.block} onValueChange={(value) => value && setBlock(value)}>
        <SelectTrigger size="sm" className="w-32" onMouseDown={(event) => event.preventDefault()}>
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

      <Select
        value={state.fontFamily}
        onValueChange={(value) =>
          value === "Default"
            ? editor.chain().focus().unsetFontFamily().run()
            : value && editor.chain().focus().setFontFamily(value).run()
        }
      >
        <SelectTrigger size="sm" className="w-28" onMouseDown={(event) => event.preventDefault()}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONTS.map((font) => (
            <SelectItem key={font} value={font} style={{ fontFamily: font === "Default" ? undefined : font }}>
              {font}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center">
        <ToolbarButton label={t("editorToolbar.decreaseFontSize")} onClick={() => setSize(currentSize - 1)}>
          <IconMinus className="size-4" />
        </ToolbarButton>
        <Select value={String(currentSize)} onValueChange={(value) => value && setSize(Number(value))}>
          <SelectTrigger size="sm" className="w-14" onMouseDown={(event) => event.preventDefault()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToolbarButton label={t("editorToolbar.increaseFontSize")} onClick={() => setSize(currentSize + 1)}>
          <IconPlus className="size-4" />
        </ToolbarButton>
      </div>

      <Divider />

      <ToolbarButton label={t("editorToolbar.bold")} active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}>
        <IconBold className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.italic")} active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <IconItalic className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.underline")} active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <IconUnderline className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.strikethrough")} active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}>
        <IconStrikethrough className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.inlineCode")} active={state.code} onClick={() => editor.chain().focus().toggleCode().run()}>
        <IconCode className="size-4" />
      </ToolbarButton>

      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("editorToolbar.textColor")}
        title={t("editorToolbar.textColor")}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => colorInput.current?.click()}
      >
        <span className="text-sm font-semibold" style={{ color: state.color }}>
          A
        </span>
        <input
          ref={colorInput}
          type="color"
          value={state.color}
          onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </Button>
      <Button
        type="button"
        variant={state.highlight ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label={t("editorToolbar.highlightColor")}
        title={t("editorToolbar.highlightColor")}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => highlightInput.current?.click()}
      >
        <IconHighlight className="size-4" />
        <input
          ref={highlightInput}
          type="color"
          defaultValue="#fef08a"
          onChange={(event) => editor.chain().focus().setHighlight({ color: event.target.value }).run()}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />
      </Button>
      <ToolbarButton label={t("editorToolbar.link")} active={state.link} onClick={setLink}>
        <IconLink className="size-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton label={t("editorToolbar.alignLeft")} active={state.alignLeft} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
        <IconAlignLeft className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.alignCenter")} active={state.alignCenter} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
        <IconAlignCenter className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.alignRight")} active={state.alignRight} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
        <IconAlignRight className="size-4" />
      </ToolbarButton>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("editorToolbar.lineSpacing")}
              title={t("editorToolbar.lineSpacing")}
              onMouseDown={(event) => event.preventDefault()}
            >
              <IconLineHeight className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="start">
          {LINE_SPACINGS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => editor.chain().focus().setLineHeight(option.value).run()}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => editor.chain().focus().setLineHeight(null).run()}>
            {t("editorToolbar.default")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Divider />

      <ToolbarButton label={t("editorToolbar.bulletList")} active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <IconList className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.numberedList")} active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <IconListNumbers className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.checklist")} active={state.taskList} onClick={() => editor.chain().focus().toggleTaskList().run()}>
        <IconListCheck className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.decreaseIndent")} onClick={() => editor.chain().focus().outdent().run()}>
        <IconIndentDecrease className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.increaseIndent")} onClick={() => editor.chain().focus().indent().run()}>
        <IconIndentIncrease className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.quote")} active={state.blockquote} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <IconBlockquote className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.codeBlock")} active={state.codeBlock} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <IconSourceCode className="size-4" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton label={t("editorToolbar.insertImage")} onClick={addImage}>
        <IconPhoto className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        label={t("editorToolbar.insertTable")}
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <IconTable className="size-4" />
      </ToolbarButton>
      <ToolbarButton label={t("editorToolbar.clearFormatting")} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
        <IconClearFormatting className="size-4" />
      </ToolbarButton>
    </div>
  )
}

export default EditorToolbar
