import { useEffect, useMemo, useReducer } from "react"
import type * as Y from "yjs"
import {
  type DatabaseApi,
  databaseApi,
  getRoots,
  type Property,
  type Row,
  seedDatabase,
  type ViewDef,
} from "./model"

export interface DatabaseState extends DatabaseApi {
  properties: Property[]
  rows: Row[]
  views: ViewDef[]
}

/** Binds a database's Yjs collections to React: re-renders on any deep change, seeds an
 *  empty document, and exposes plain snapshots plus the mutation API. */
export const useDatabase = (ydoc: Y.Doc): DatabaseState => {
  const roots = useMemo(() => getRoots(ydoc), [ydoc])
  const api = useMemo(() => databaseApi(ydoc), [ydoc])
  const [, rerender] = useReducer((count: number) => count + 1, 0)

  useEffect(() => {
    const onChange = () => rerender()
    roots.properties.observeDeep(onChange)
    roots.rows.observeDeep(onChange)
    roots.views.observeDeep(onChange)
    return () => {
      roots.properties.unobserveDeep(onChange)
      roots.rows.unobserveDeep(onChange)
      roots.views.unobserveDeep(onChange)
    }
  }, [roots])

  useEffect(() => {
    seedDatabase(ydoc)
  }, [ydoc])

  const properties = roots.properties.toJSON() as Property[]
  const rows = roots.rows.toJSON() as Row[]
  const views = roots.views.toJSON() as ViewDef[]

  return { ...api, properties, rows, views }
}
