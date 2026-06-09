"use client"

import { DATABASE_MIME } from "@lib/docs"
import type { CollabDocument } from "@lib/useCollabDocument"
import CollabHeader from "@components/CollabHeader/CollabHeader"
import CollabBoundary from "@pages/Collab/CollabBoundary"
import DatabaseCanvas from "@pages/Notes/components/Database/DatabaseCanvas"
import NoteCanvas from "@pages/Notes/components/NoteCanvas/NoteCanvas"

const NoteWorkspace = ({ nodeId, collab }: { nodeId: string; collab: CollabDocument }) => {
  const isDatabase = collab.doc?.mimeType === DATABASE_MIME
  return (
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
      {isDatabase ? <DatabaseCanvas collab={collab} /> : <NoteCanvas collab={collab} />}
    </div>
  )
}

const NoteEditor = ({ nodeId }: { nodeId: string }) => (
  <CollabBoundary
    nodeId={nodeId}
    backHref="/notes"
    render={(collab) => <NoteWorkspace nodeId={nodeId} collab={collab} />}
  />
)

export default NoteEditor
