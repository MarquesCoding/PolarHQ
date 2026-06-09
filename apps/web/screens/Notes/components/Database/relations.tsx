"use client"

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react"
import { secretboxOpen } from "@lib/crypto"
import { fetchDocContent } from "@lib/docs"
import { e2eReady, getDocContentKey, isDocEncrypted, isUnlocked } from "@lib/e2e"
import * as Y from "yjs"
import { getRoots, type Property, type Row, rowTitle } from "./model"

export interface DbSnapshot {
  status: "loading" | "ready" | "error" | "locked"
  properties: Property[]
  rows: Row[]
}

const EMPTY: DbSnapshot = { status: "loading", properties: [], rows: [] }

/** The display title of a row in a loaded snapshot. */
export const snapshotTitle = (snapshot: DbSnapshot | undefined, rowId: string): string => {
  const row = snapshot?.rows.find((candidate) => candidate.id === rowId)
  return row && snapshot ? rowTitle(snapshot.properties, row) : "…"
}

/** Read-only load of another database's full rows, decrypting if E2E. No live relay. */
const loadSnapshot = async (nodeId: string): Promise<DbSnapshot> => {
  await e2eReady()
  const encrypted = await isDocEncrypted(nodeId)
  let key: Uint8Array | null = null
  if (encrypted) {
    if (!isUnlocked()) return { status: "locked", properties: [], rows: [] }
    key = await getDocContentKey(nodeId)
    if (!key) return { status: "error", properties: [], rows: [] }
  }
  const content = await fetchDocContent(nodeId)
  let bytes: Uint8Array = new Uint8Array(content)
  if (key && bytes.byteLength > 0) bytes = secretboxOpen(bytes, key)
  const doc = new Y.Doc()
  if (bytes.byteLength > 0) Y.applyUpdate(doc, bytes)
  const roots = getRoots(doc)
  const properties = roots.properties.toJSON() as Property[]
  const rows = roots.rows.toJSON() as Row[]
  doc.destroy()
  return { status: "ready", properties, rows }
}

export const useDatabaseSnapshot = (nodeId: string | null): DbSnapshot => {
  const [snapshot, setSnapshot] = useState<DbSnapshot>(EMPTY)
  useEffect(() => {
    if (!nodeId) return
    let cancelled = false
    loadSnapshot(nodeId)
      .then((result) => {
        if (!cancelled) setSnapshot(result)
      })
      .catch(() => {
        if (!cancelled) setSnapshot({ status: "error", properties: [], rows: [] })
      })
    return () => {
      cancelled = true
    }
  }, [nodeId])
  return snapshot
}

const RelationContext = createContext<Record<string, DbSnapshot>>({})

export const useRelationSources = (): Record<string, DbSnapshot> => useContext(RelationContext)

const Source = ({
  id,
  onReady,
}: {
  id: string
  onReady: (id: string, snapshot: DbSnapshot) => void
}) => {
  const snapshot = useDatabaseSnapshot(id)
  useEffect(() => {
    onReady(id, snapshot)
  }, [id, snapshot, onReady])
  return null
}

/** Loads each linked database once and exposes their row snapshots by node id via context. */
export const RelationProvider = ({
  targetIds,
  children,
}: {
  targetIds: string[]
  children: ReactNode
}) => {
  const [map, setMap] = useState<Record<string, DbSnapshot>>({})
  const onReady = useCallback((id: string, snapshot: DbSnapshot) => {
    setMap((prev) => (prev[id] === snapshot ? prev : { ...prev, [id]: snapshot }))
  }, [])
  return (
    <RelationContext.Provider value={map}>
      {targetIds.map((id) => (
        <Source key={id} id={id} onReady={onReady} />
      ))}
      {children}
    </RelationContext.Provider>
  )
}
