"use client"

import CollabHeader from "@components/CollabHeader/CollabHeader"
import CollabBoundary from "@pages/Collab/CollabBoundary"
import SheetGrid from "@pages/Sheets/components/SheetGrid/SheetGrid"

const Editor = ({ nodeId }: { nodeId: string }) => (
  <CollabBoundary
    nodeId={nodeId}
    backHref="/sheets"
    render={(collab) => (
      <div className="flex min-h-full flex-1 flex-col gap-3 p-4">
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
        <SheetGrid ydoc={collab.ydoc} />
      </div>
    )}
  />
)

export default Editor
