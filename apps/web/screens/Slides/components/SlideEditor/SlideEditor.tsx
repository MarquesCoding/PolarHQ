"use client"

import { Collaboration } from "@tiptap/extension-collaboration"
import { Color } from "@tiptap/extension-color"
import { Highlight } from "@tiptap/extension-highlight"
import { Image } from "@tiptap/extension-image"
import { Placeholder } from "@tiptap/extension-placeholder"
import { TextAlign } from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { cn } from "@workspace/ui/lib/utils"
import type * as Y from "yjs"
import EditorToolbar from "@pages/Docs/components/EditorToolbar/EditorToolbar"

export const slideFragmentName = (slideId: string): string => `slide:${slideId}`

interface SlideEditorProps {
  ydoc: Y.Doc
  slideId: string
  editable?: boolean
  className?: string
}

/** A TipTap editor bound to one slide's Yjs fragment. Re-mount (keyed by slideId) to switch slides. */
const SlideEditor = ({ ydoc, slideId, editable = true, className }: SlideEditorProps) => {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ undoRedo: false, link: { openOnClick: false } }),
      TextStyle,
      Color,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
      Placeholder.configure({ placeholder: "Add a title or content…" }),
      Collaboration.configure({ fragment: ydoc.getXmlFragment(slideFragmentName(slideId)) }),
    ],
    editorProps: { attributes: { class: "doc-editor focus:outline-none" } },
  })

  return (
    <div className="flex flex-col gap-3">
      {editable && editor ? (
        <div className="mx-auto w-full max-w-4xl">
          <EditorToolbar editor={editor} />
        </div>
      ) : null}
      <div
        onClick={() => editable && editor?.chain().focus().run()}
        className={cn(
          "bg-card mx-auto aspect-video w-full max-w-4xl overflow-auto rounded-xl border p-10",
          editable && "cursor-text",
          className,
        )}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default SlideEditor
