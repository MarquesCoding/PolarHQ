import { type Editor, Mark, mergeAttributes } from "@tiptap/core"

/** The shape of a comment thread stored in the Yjs `docThreads` map (keyed by threadId). */
export interface CommentThread {
  id: string
  resolved: boolean
  createdAt: number
}

/** A single comment stored in the Yjs `docComments` array. */
export interface DocComment {
  id: string
  threadId: string
  authorName: string
  authorColor: string
  body: string
  createdAt: number
}

export const COMMENT_MARK = "comment"

/**
 * Inline mark anchoring a comment thread to a range of text. The threadId links the
 * highlighted text to its thread; the mark travels with the doc (so it syncs via Yjs).
 */
export const CommentMark = Mark.create({
  name: COMMENT_MARK,
  inclusive: false,
  excludes: "",

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-thread"),
        renderHTML: (attributes) =>
          attributes.threadId ? { "data-thread": attributes.threadId as string } : {},
      },
    }
  },

  parseHTML() {
    return [{ tag: "span[data-thread]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "doc-comment" }), 0]
  },
})

/** The document range covered by a thread's mark, or null if it's no longer present. */
export const findThreadRange = (
  editor: Editor,
  threadId: string,
): { from: number; to: number } | null => {
  let range: { from: number; to: number } | null = null
  editor.state.doc.descendants((node, pos) => {
    if (range) return false
    if (
      node.isText &&
      node.marks.some((mark) => mark.type.name === COMMENT_MARK && mark.attrs.threadId === threadId)
    ) {
      range = { from: pos, to: pos + node.nodeSize }
    }
    return true
  })
  return range
}

/** The thread id of the comment mark at a document position, if any. */
export const threadIdAt = (editor: Editor, pos: number): string | null => {
  const resolved = editor.state.doc.resolve(pos)
  const mark = resolved
    .marks()
    .find((candidate) => candidate.type.name === COMMENT_MARK)
  return (mark?.attrs.threadId as string | undefined) ?? null
}
