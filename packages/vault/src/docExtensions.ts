import { type CommandProps, Extension } from "@tiptap/core"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
    lineHeight: {
      setLineHeight: (value: string | null) => ReturnType
    }
    textStyle: {
      removeEmptyTextStyle: () => ReturnType
    }
  }
}

/** Adds a `fontSize` attribute to the textStyle mark (e.g. "14px"). */
export const FontSize = Extension.create({
  name: "fontSize",
  addOptions() {
    return { types: ["textStyle"] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) =>
              attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }: CommandProps) =>
          chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }: CommandProps) =>
          chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
})

const INDENT_STEP_EM = 2.5

/** Block indentation for paragraphs and headings (Google-Docs indent buttons). */
export const Indent = Extension.create({
  name: "indent",
  addOptions() {
    return { types: ["paragraph", "heading"], max: 10 }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => Number(element.getAttribute("data-indent")) || 0,
            renderHTML: (attributes) =>
              attributes.indent
                ? {
                    "data-indent": attributes.indent,
                    style: `margin-left: ${attributes.indent * INDENT_STEP_EM}em`,
                  }
                : {},
          },
        },
      },
    ]
  },
  addCommands() {
    const shift =
      (delta: number) =>
      ({ tr, state, dispatch }: CommandProps) => {
        const { from, to } = state.selection
        let changed = false
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!this.options.types.includes(node.type.name)) return
          const current = (node.attrs.indent as number) ?? 0
          const next = Math.min(this.options.max, Math.max(0, current + delta))
          if (next !== current) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next })
            changed = true
          }
        })
        if (changed && dispatch) dispatch(tr)
        return changed
      }
    return {
      indent: () => shift(1),
      outdent: () => shift(-1),
    }
  },
})

/** Line spacing for paragraphs and headings. */
export const LineHeight = Extension.create({
  name: "lineHeight",
  addOptions() {
    return { types: ["paragraph", "heading"] }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {},
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setLineHeight:
        (value: string | null) =>
        ({ tr, state, dispatch }: CommandProps) => {
          const { from, to } = state.selection
          let changed = false
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (!this.options.types.includes(node.type.name)) return
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight: value })
            changed = true
          })
          if (changed && dispatch) dispatch(tr)
          return changed
        },
    }
  },
})
