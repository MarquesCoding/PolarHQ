"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { type DocMeta, fetchDoc, fetchDocContent } from "@lib/docs"
import { Button } from "@workspace/ui/components/button"
import { PageSpinner } from "@components/Spinner/Spinner"
import * as Y from "yjs"
import DocCanvas from "@pages/Docs/components/DocCanvas/DocCanvas"

type Status = "loading" | "ready" | "error"

/** Loads a document's snapshot into a Yjs doc, then mounts the editing surface. */
const Editor = ({ nodeId }: { nodeId: string }) => {
  const [ydoc] = useState(() => new Y.Doc())
  const [doc, setDoc] = useState<DocMeta | null>(null)
  const [status, setStatus] = useState<Status>("loading")

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [meta, content] = await Promise.all([fetchDoc(nodeId), fetchDocContent(nodeId)])
        if (cancelled) return
        if (content.byteLength > 0) Y.applyUpdate(ydoc, new Uint8Array(content))
        setDoc(meta)
        setStatus("ready")
      } catch {
        if (!cancelled) setStatus("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [nodeId, ydoc])

  if (status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <p className="text-muted-foreground text-sm">This document could not be opened.</p>
        <Button variant="secondary" size="sm" render={<Link href="/docs">Back to Docs</Link>} />
      </div>
    )
  }

  if (status !== "ready" || !doc) return <PageSpinner />

  return <DocCanvas nodeId={nodeId} ydoc={ydoc} doc={doc} />
}

export default Editor
