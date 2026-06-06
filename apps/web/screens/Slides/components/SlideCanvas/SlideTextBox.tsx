"use client"

import { useEffect } from "react"
import { Collaboration } from "@tiptap/extension-collaboration"
import { Color } from "@tiptap/extension-color"
import { Placeholder } from "@tiptap/extension-placeholder"
import { TextAlign } from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { safeLinkOptions } from "@lib/editorConfig"
import type * as Y from "yjs"

export const textFragmentName = (elId: string): string => `el:${elId}:text`

interface SlideTextBoxProps {
  ydoc: Y.Doc
  elId: string
  editable: boolean
  color?: string
}

/** A rich-text box bound to a slide element's Yjs fragment. */
const SlideTextBox = ({ ydoc, elId, editable, color }: SlideTextBoxProps) => {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({ undoRedo: false, link: safeLinkOptions }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: "Text" }),
      Collaboration.configure({ fragment: ydoc.getXmlFragment(textFragmentName(elId)) }),
    ],
    editorProps: { attributes: { class: "doc-editor h-full focus:outline-none" } },
  })

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  return (
    <div className="h-full w-full overflow-hidden" style={{ color }}>
      <EditorContent editor={editor} />
    </div>
  )
}

export default SlideTextBox
