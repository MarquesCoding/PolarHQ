"use client"

import type { ReactNode } from "react"
import { useRouter } from "@polarhq/interface/lib/router"
import { sanitizeLinkHref } from "@polarhq/vault/editorConfig"
import type { Editor } from "@tiptap/react"
import { Button } from "@polarhq/ui/components/button"
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
} from "@polarhq/ui/components/dropdown-menu"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation("docs")
  const exportDocx = async () => {
    try {
      const { exportDocument } = await import("@polarhq/vault/officeExport")
      await exportDocument(editor.getHTML(), title || "Document")
    } catch {
      toast.error(t("docMenuBar.couldNotExport"))
    }
  }
  const run = (fn: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) =>
    fn(editor.chain().focus()).run()

  const insertImage = () => {
    const url = window.prompt(t("docMenuBar.imageUrl"))
    if (url) editor.chain().focus().setImage({ src: url }).run()
  }
  const insertLink = () => {
    const input = window.prompt(t("docMenuBar.linkUrl"))
    if (!input) return
    const href = sanitizeLinkHref(input)
    if (href) editor.chain().focus().setLink({ href }).run()
  }
  const wordCount = () => {
    const text = editor.getText().trim()
    const words = text ? text.split(/\s+/).length : 0
    toast.info(t("docMenuBar.wordCharCount", { words, characters: text.length }))
  }

  return (
    <div className="bg-card flex items-center gap-0.5 border-b px-1.5 py-0.5 text-sm">
      <Menu label={t("docMenuBar.file")}>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("docMenuBar.download")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => void exportDocx()}>
              {t("docMenuBar.microsoftWordDocx")}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => window.print()}>
          {t("docMenuBar.print")}
          <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/docs")}>{t("docMenuBar.backToDocs")}</DropdownMenuItem>
      </Menu>

      <Menu label={t("docMenuBar.edit")}>
        <DropdownMenuItem onClick={() => run((c) => c.undo())}>
          {t("docMenuBar.undo")}
          <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((c) => c.redo())}>
          {t("docMenuBar.redo")}
          <DropdownMenuShortcut>⌘Y</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => editor.chain().focus().selectAll().run()}>
          {t("docMenuBar.selectAll")}
          <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((c) => c.unsetAllMarks().clearNodes())}>
          {t("docMenuBar.clearFormatting")}
        </DropdownMenuItem>
      </Menu>

      <Menu label={t("docMenuBar.view")}>
        <DropdownMenuCheckboxItem checked={commentsOpen} onCheckedChange={onToggleComments}>
          {t("docMenuBar.showComments")}
        </DropdownMenuCheckboxItem>
      </Menu>

      <Menu label={t("docMenuBar.insert")}>
        <DropdownMenuItem onClick={insertImage}>{t("docMenuBar.image")}</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          {t("docMenuBar.table")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={insertLink}>{t("docMenuBar.link")}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((c) => c.setHorizontalRule())}>
          {t("docMenuBar.horizontalLine")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAddComment}>{t("docMenuBar.comment")}</DropdownMenuItem>
      </Menu>

      <Menu label={t("docMenuBar.format")}>
        <DropdownMenuItem onClick={() => run((c) => c.toggleBold())}>
          {t("docMenuBar.bold")}
          <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((c) => c.toggleItalic())}>
          {t("docMenuBar.italic")}
          <DropdownMenuShortcut>⌘I</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((c) => c.toggleUnderline())}>
          {t("docMenuBar.underline")}
          <DropdownMenuShortcut>⌘U</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => run((c) => c.toggleStrike())}>{t("docMenuBar.strikethrough")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("docMenuBar.paragraphStyles")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => run((c) => c.setParagraph())}>{t("docMenuBar.normalText")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.setHeading({ level: 1 }))}>{t("docMenuBar.heading1")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.setHeading({ level: 2 }))}>{t("docMenuBar.heading2")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.setHeading({ level: 3 }))}>{t("docMenuBar.heading3")}</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("docMenuBar.align")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => run((c) => c.setTextAlign("left"))}>{t("docMenuBar.left")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.setTextAlign("center"))}>{t("docMenuBar.center")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.setTextAlign("right"))}>{t("docMenuBar.right")}</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t("docMenuBar.lists")}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => run((c) => c.toggleBulletList())}>{t("docMenuBar.bulleted")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.toggleOrderedList())}>{t("docMenuBar.numbered")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => run((c) => c.toggleTaskList())}>{t("docMenuBar.checklist")}</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => run((c) => c.unsetAllMarks().clearNodes())}>
          {t("docMenuBar.clearFormatting")}
        </DropdownMenuItem>
      </Menu>

      <Menu label={t("docMenuBar.tools")}>
        <DropdownMenuItem onClick={wordCount}>{t("docMenuBar.wordCount")}</DropdownMenuItem>
      </Menu>

      <Menu label={t("docMenuBar.help")}>
        <DropdownMenuItem
          onClick={() =>
            toast.info(t("docMenuBar.shortcutsHint"))
          }
        >
          {t("docMenuBar.keyboardShortcuts")}
        </DropdownMenuItem>
      </Menu>
    </div>
  )
}

export default DocMenuBar
