"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { secretboxOpen, secretboxSeal } from "@lib/crypto"
import { type DocMeta, fetchDoc, fetchDocContent, saveDocContent } from "@lib/docs"
import { e2eReady, getDocContentKey, isDocEncrypted, isUnlocked } from "@lib/e2e"
import { RelayProvider } from "@lib/yjsProvider"
import * as Y from "yjs"

type Status = "loading" | "ready" | "error" | "locked"
type SaveState = "saved" | "saving" | "dirty"

export interface CollabDocument {
  status: Status
  doc: DocMeta | null
  encrypted: boolean
  ydoc: Y.Doc
  provider: RelayProvider | null
  contentKey: Uint8Array | null
  saveState: SaveState
  lastSavedAt: number | null
  /** Force an immediate save of the current state. */
  save: () => Promise<void>
  /** Re-run the load (e.g. after the user unlocks encryption). */
  retry: () => void
}

/**
 * Loads a Drive-stored Yjs document (decrypting if E2E), connects the live relay, and
 * autosaves edits. Shared by the Docs, Sheets, and Slides editors — only the UI differs.
 */
export const useCollabDocument = (nodeId: string): CollabDocument => {
  const [ydoc] = useState(() => new Y.Doc())
  const [provider, setProvider] = useState<RelayProvider | null>(null)
  const [doc, setDoc] = useState<DocMeta | null>(null)
  const [contentKey, setContentKey] = useState<Uint8Array | null>(null)
  const [encrypted, setEncrypted] = useState(false)
  const [status, setStatus] = useState<Status>("loading")
  const [saveState, setSaveState] = useState<SaveState>("saved")
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)
  const [reload, setReload] = useState(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const dirtyRef = useRef(false)
  const keyRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    let cancelled = false
    let prov: RelayProvider | undefined
    void (async () => {
      try {
        await e2eReady()
        const [meta, enc] = await Promise.all([fetchDoc(nodeId), isDocEncrypted(nodeId)])
        if (cancelled) return
        setDoc(meta)
        setEncrypted(enc)

        let key: Uint8Array | null = null
        if (enc) {
          if (!isUnlocked()) {
            setStatus("locked")
            return
          }
          key = await getDocContentKey(nodeId)
          if (cancelled) return
          if (!key) {
            setStatus("error")
            return
          }
        }

        const content = await fetchDocContent(nodeId)
        if (cancelled) return
        let bytes: Uint8Array = new Uint8Array(content)
        if (key && bytes.byteLength > 0) {
          try {
            bytes = secretboxOpen(bytes, key)
          } catch {
            setStatus("error")
            return
          }
        }
        if (bytes.byteLength > 0) Y.applyUpdate(ydoc, bytes)

        keyRef.current = key
        prov = new RelayProvider(nodeId, ydoc, key ?? undefined)
        setProvider(prov)
        setContentKey(key)
        setLastSavedAt(meta.updatedAt ? new Date(meta.updatedAt).getTime() : null)
        setStatus("ready")
      } catch {
        if (!cancelled) setStatus("error")
      }
    })()
    return () => {
      cancelled = true
      prov?.destroy()
    }
  }, [nodeId, ydoc, reload])

  const flush = useCallback(async () => {
    clearTimeout(saveTimer.current)
    if (!dirtyRef.current) return
    dirtyRef.current = false
    setSaveState("saving")
    try {
      let bytes = Y.encodeStateAsUpdate(ydoc)
      if (keyRef.current) bytes = secretboxSeal(bytes, keyRef.current)
      await saveDocContent(nodeId, bytes)
      setLastSavedAt(Date.now())
      setSaveState("saved")
    } catch {
      dirtyRef.current = true
      setSaveState("dirty")
    }
  }, [nodeId, ydoc])

  useEffect(() => {
    if (status !== "ready") return
    const onUpdate = () => {
      dirtyRef.current = true
      // Yjs observers can fire mid-render (e.g. while React is rendering an editor that
      // reads the doc); defer the React state update so we never setState during render.
      queueMicrotask(() => setSaveState("dirty"))
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => void flush(), 800)
    }
    ydoc.on("update", onUpdate)
    return () => {
      ydoc.off("update", onUpdate)
      clearTimeout(saveTimer.current)
      void flush()
    }
  }, [status, ydoc, flush])

  const save = useCallback(async () => {
    dirtyRef.current = true
    await flush()
  }, [flush])

  const retry = useCallback(() => {
    setStatus("loading")
    setReload((value) => value + 1)
  }, [])

  return {
    status,
    doc,
    encrypted,
    ydoc,
    provider,
    contentKey,
    saveState,
    lastSavedAt,
    save,
    retry,
  }
}
