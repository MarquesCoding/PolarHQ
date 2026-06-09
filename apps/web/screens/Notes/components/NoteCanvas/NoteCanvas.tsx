"use client"

import type { CollabDocument } from "@lib/useCollabDocument"
import BlockEditor from "@pages/Notes/components/BlockEditor/BlockEditor"

/** The note page body: a collaborative, block-based editor bound to the document body. */
const NoteCanvas = ({ collab }: { collab: CollabDocument }) => (
  <div className="scrollbar-slim flex-1 overflow-y-auto">
    <div className="mx-auto max-w-3xl px-8 py-10">
      <BlockEditor
        ydoc={collab.ydoc}
        provider={collab.provider!}
        className="min-h-[50vh]"
        placeholder="Type ‘/’ for commands, or just start writing…"
      />
    </div>
  </div>
)

export default NoteCanvas
