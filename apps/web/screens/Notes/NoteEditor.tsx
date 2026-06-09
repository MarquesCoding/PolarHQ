"use client"

import type { CollabDocument } from "@lib/useCollabDocument"
import CollabHeader from "@components/CollabHeader/CollabHeader"
import CollabBoundary from "@pages/Collab/CollabBoundary"
import NoteCanvas from "@pages/Notes/components/NoteCanvas/NoteCanvas"

const NoteWorkspace = ({ nodeId, collab }: { nodeId: string; collab: CollabDocument }) => (
  <div className="flex min-h-0 flex-1 flex-col">
    <CollabHeader
      nodeId={nodeId}
      doc={collab.doc!}
      provider={collab.provider!}
      encrypted={collab.encrypted}
      saveState={collab.saveState}
      lastSavedAt={collab.lastSavedAt}
      onSave={() => void collab.save()}
      contentKey={collab.contentKey}
    />
    <NoteCanvas collab={collab} />
  </div>
)

const NoteEditor = ({ nodeId }: { nodeId: string }) => (
  <CollabBoundary
    nodeId={nodeId}
    backHref="/notes"
    render={(collab) => <NoteWorkspace nodeId={nodeId} collab={collab} />}
  />
)

export default NoteEditor
