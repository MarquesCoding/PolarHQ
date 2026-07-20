import type { DriveNode } from "@workspace/core/drive"
import type { DriveSort } from "@workspace/screens/store/uiSlice"

const kindKey = (node: DriveNode): string => (node.kind === "folder" ? "" : (node.mimeType ?? ""))
const byName = (a: DriveNode, b: DriveNode): number =>
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })

/**
 * Comparator for Drive listings honouring the user's sort choice. Folders always come first, then
 * special/locked items — a file-browser convention independent of the chosen key/direction; the
 * key + direction order the rest (name is the tiebreak).
 */
export const compareNodes =
  (sort: DriveSort) =>
  (a: DriveNode, b: DriveNode): number => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1
    const rank = (node: DriveNode) => (node.special ? 0 : node.locked ? 1 : 2)
    if (rank(a) !== rank(b)) return rank(a) - rank(b)

    let cmp = 0
    switch (sort.key) {
      case "size":
        cmp = (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0)
        break
      case "modified":
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        break
      case "kind":
        cmp = kindKey(a).localeCompare(kindKey(b))
        break
      case "name":
        break
    }
    if (cmp === 0) cmp = byName(a, b)
    return sort.dir === "asc" ? cmp : -cmp
  }
