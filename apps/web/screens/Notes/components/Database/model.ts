import * as Y from "yjs"

/** A column's value type. */
export type PropType = "text" | "number" | "select" | "multiSelect" | "checkbox" | "date" | "url"

export interface SelectOption {
  id: string
  name: string
  color: string
}

export interface Property {
  id: string
  name: string
  type: PropType
  options?: SelectOption[]
}

export type ViewType = "table" | "board" | "gallery"

export interface ViewDef {
  id: string
  name: string
  type: ViewType
  /** For board/gallery: the select property used to group cards. */
  groupBy?: string
}

/** A row is a bag of cell values keyed by property id, plus its own id. */
export interface Row {
  id: string
  [propId: string]: unknown
}

export const OPTION_PALETTE: { key: string; value: string }[] = [
  { key: "gray", value: "#9ca3af" },
  { key: "brown", value: "#b08968" },
  { key: "orange", value: "#f59e0b" },
  { key: "yellow", value: "#eab308" },
  { key: "green", value: "#22c55e" },
  { key: "blue", value: "#3b82f6" },
  { key: "purple", value: "#8b5cf6" },
  { key: "pink", value: "#ec4899" },
  { key: "red", value: "#ef4444" },
]

export const colorValue = (key: string): string =>
  OPTION_PALETTE.find((color) => color.key === key)?.value ?? "#9ca3af"

const pickColor = (index: number): string =>
  OPTION_PALETTE[index % OPTION_PALETTE.length]!.key

export const PROP_LABELS: Record<PropType, string> = {
  text: "Text",
  number: "Number",
  select: "Select",
  multiSelect: "Multi-select",
  checkbox: "Checkbox",
  date: "Date",
  url: "URL",
}

const uid = (): string => crypto.randomUUID()

interface Roots {
  properties: Y.Array<Y.Map<unknown>>
  rows: Y.Array<Y.Map<unknown>>
  views: Y.Array<Y.Map<unknown>>
}

export const getRoots = (ydoc: Y.Doc): Roots => ({
  properties: ydoc.getArray<Y.Map<unknown>>("db:properties"),
  rows: ydoc.getArray<Y.Map<unknown>>("db:rows"),
  views: ydoc.getArray<Y.Map<unknown>>("db:views"),
})

const makeProperty = (name: string, type: PropType): Y.Map<unknown> => {
  const map = new Y.Map<unknown>()
  map.set("id", uid())
  map.set("name", name)
  map.set("type", type)
  if (type === "select" || type === "multiSelect") map.set("options", new Y.Array())
  return map
}

const makeOption = (name: string, color: string): Y.Map<unknown> => {
  const map = new Y.Map<unknown>()
  map.set("id", uid())
  map.set("name", name)
  map.set("color", color)
  return map
}

const makeView = (name: string, type: ViewType, groupBy?: string): Y.Map<unknown> => {
  const map = new Y.Map<unknown>()
  map.set("id", uid())
  map.set("name", name)
  map.set("type", type)
  if (groupBy) map.set("groupBy", groupBy)
  return map
}

const indexOf = (arr: Y.Array<Y.Map<unknown>>, id: string): number => {
  let found = -1
  arr.forEach((map, i) => {
    if (map.get("id") === id) found = i
  })
  return found
}

const mapById = (arr: Y.Array<Y.Map<unknown>>, id: string): Y.Map<unknown> | null => {
  const idx = indexOf(arr, id)
  return idx === -1 ? null : arr.get(idx)
}

/** Populate a fresh database with a default schema and a few empty rows. */
export const seedDatabase = (ydoc: Y.Doc): void => {
  const { properties, rows, views } = getRoots(ydoc)
  if (properties.length > 0 || views.length > 0) return
  ydoc.transact(() => {
    const name = makeProperty("Name", "text")
    const status = makeProperty("Status", "select")
    const statusOptions = status.get("options") as Y.Array<Y.Map<unknown>>
    ;["To do", "In progress", "Done"].forEach((label, i) =>
      statusOptions.push([makeOption(label, pickColor(i + 3))]),
    )
    const date = makeProperty("Date", "date")
    properties.push([name, status, date])
    views.push([makeView("Table", "table")])
    for (let i = 0; i < 3; i += 1) {
      const row = new Y.Map<unknown>()
      row.set("id", uid())
      rows.push([row])
    }
  })
}

const defaultName = (type: PropType): string => PROP_LABELS[type]

/** All mutations for a database, bound to one Yjs document. */
export const databaseApi = (ydoc: Y.Doc) => {
  const roots = getRoots(ydoc)
  const tx = (fn: () => void) => ydoc.transact(fn)

  return {
    addProperty(type: PropType): void {
      tx(() => roots.properties.push([makeProperty(defaultName(type), type)]))
    },
    renameProperty(id: string, name: string): void {
      tx(() => mapById(roots.properties, id)?.set("name", name))
    },
    retypeProperty(id: string, type: PropType): void {
      tx(() => {
        const prop = mapById(roots.properties, id)
        if (!prop) return
        prop.set("type", type)
        if ((type === "select" || type === "multiSelect") && !prop.get("options"))
          prop.set("options", new Y.Array())
      })
    },
    deleteProperty(id: string): void {
      tx(() => {
        const idx = indexOf(roots.properties, id)
        if (idx !== -1) roots.properties.delete(idx, 1)
      })
    },
    addOption(propId: string, name: string): string | null {
      let optionId: string | null = null
      tx(() => {
        const prop = mapById(roots.properties, propId)
        if (!prop) return
        let options = prop.get("options") as Y.Array<Y.Map<unknown>> | undefined
        if (!options) {
          options = new Y.Array()
          prop.set("options", options)
        }
        const option = makeOption(name, pickColor(options.length))
        options.push([option])
        optionId = option.get("id") as string
      })
      return optionId
    },
    addRow(values?: Record<string, unknown>): string {
      const id = uid()
      tx(() => {
        const row = new Y.Map<unknown>()
        row.set("id", id)
        if (values) Object.entries(values).forEach(([key, value]) => row.set(key, value))
        roots.rows.push([row])
      })
      return id
    },
    setCell(rowId: string, propId: string, value: unknown): void {
      tx(() => mapById(roots.rows, rowId)?.set(propId, value))
    },
    deleteRow(rowId: string): void {
      tx(() => {
        const idx = indexOf(roots.rows, rowId)
        if (idx !== -1) roots.rows.delete(idx, 1)
      })
    },
    addView(type: ViewType, groupBy?: string): string {
      const view = makeView(
        type === "table" ? "Table" : type === "board" ? "Board" : "Gallery",
        type,
        groupBy,
      )
      tx(() => roots.views.push([view]))
      return view.get("id") as string
    },
    updateView(id: string, patch: Partial<Omit<ViewDef, "id">>): void {
      tx(() => {
        const view = mapById(roots.views, id)
        if (!view) return
        Object.entries(patch).forEach(([key, value]) => view.set(key, value))
      })
    },
    deleteView(id: string): void {
      tx(() => {
        const idx = indexOf(roots.views, id)
        if (idx !== -1) roots.views.delete(idx, 1)
      })
    },
  }
}

export type DatabaseApi = ReturnType<typeof databaseApi>
