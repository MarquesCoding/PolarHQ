import { type DocType, type DocMeta, openEditor } from "@lib/docs"
import { type DriveNode, renameDriveNode } from "@lib/drive"
import { fetchDecryptedFile } from "@lib/driveE2e"
import { createEncryptedDoc, encryptNameWith } from "@lib/e2e"
import type { ImportPayload } from "@lib/officeImport"
import * as Y from "yjs"

const IMPORT_PREFIX = "orbit:import:"

/** Map a filename to the editor that can open it, or null if it isn't an Office/Google file. */
export const officeTypeForName = (name: string): DocType | null => {
  const ext = name.toLowerCase().split(".").pop() ?? ""
  if (["xlsx", "xls", "csv", "tsv", "ods"].includes(ext)) return "sheet"
  if (["docx", "txt", "md", "markdown"].includes(ext)) return "doc"
  if (ext === "pptx") return "slides"
  return null
}

/** Lazy-load the heavy Office parsers (xlsx/mammoth/fflate) only when a file is imported. */
const parseFor = async (file: File, type: DocType): Promise<ImportPayload> => {
  const parsers = await import("@lib/officeImport")
  if (type === "sheet") return parsers.parseSpreadsheet(file)
  if (type === "slides") return parsers.parsePresentation(file)
  return parsers.parseDocument(file)
}

/**
 * Parse an uploaded Office/Google file, create a new encrypted document of the right type,
 * stash the parsed content (read once by the editor on first load), then open the editor.
 */
export const importFile = async (
  file: File,
  type: DocType,
  router: { push: (href: string) => void },
  parentId: string | null = null,
): Promise<DocMeta> => {
  const payload = await parseFor(file, type)
  const doc = await createEncryptedDoc(parentId, type)
  try {
    localStorage.setItem(IMPORT_PREFIX + doc.id, JSON.stringify(payload))
  } catch {
    /* payload too large for localStorage — open the (empty) doc anyway */
  }
  openEditor(type, doc.id, router)
  return doc
}

/** Read a Drive file's (decrypted) bytes as a File for parsing. */
const fileFromNode = async (node: DriveNode): Promise<File | null> => {
  if (node.kind !== "file" || !node.downloadUrl) return null
  let url = node.downloadUrl
  let revoke = false
  if (node.encrypted) {
    const decrypted = await fetchDecryptedFile(node.id, node.downloadUrl, node.mimeType)
    if (!decrypted) return null
    url = decrypted
    revoke = true
  }
  const response = await fetch(url, { credentials: "include" })
  const blob = await response.blob()
  if (revoke) URL.revokeObjectURL(url)
  return new File([blob], node.name, { type: node.mimeType ?? undefined })
}

/** Open an Office/Google file already in Drive by converting it into a new document. */
export const importDriveFile = async (
  node: DriveNode,
  type: DocType,
  router: { push: (href: string) => void },
): Promise<DocMeta> => {
  const file = await fileFromNode(node)
  if (!file) throw new Error("Could not read file")
  return importFile(file, type, router, node.parentId ?? null)
}

/** Read and clear the import payload for a freshly-created document (one-shot). */
export const takeImport = (nodeId: string): ImportPayload | null => {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(IMPORT_PREFIX + nodeId)
  if (!raw) return null
  localStorage.removeItem(IMPORT_PREFIX + nodeId)
  try {
    return JSON.parse(raw) as ImportPayload
  } catch {
    return null
  }
}

/** Rename the Drive node to the imported file's name (encrypting it for collaborators). */
export const applyImportName = (
  nodeId: string,
  name: string,
  contentKey: Uint8Array | null,
): void => {
  if (!name) return
  const sharedName = contentKey ? encryptNameWith(name, contentKey) : null
  void renameDriveNode(nodeId, name, sharedName)
}

/** Build slide elements + text boxes from a parsed presentation into the slides Yjs structures. */
export const applySlidesImport = (
  ydoc: Y.Doc,
  slidesArray: Y.Array<string>,
  slides: Array<{ texts: string[] }>,
): void => {
  ydoc.transact(() => {
    for (const slide of slides) {
      const slideId = crypto.randomUUID()
      const elements = ydoc.getArray<string>(`slide:${slideId}:els`)
      const texts = slide.texts.length ? slide.texts : [""]
      texts.forEach((text, index) => {
        const elId = crypto.randomUUID()
        const element = ydoc.getMap<unknown>(`el:${elId}`)
        element.set("type", "text")
        element.set("x", 0.08)
        element.set("y", 0.08 + index * 0.16)
        element.set("w", 0.84)
        element.set("h", 0.14)
        const fragment = ydoc.getXmlFragment(`el:${elId}:text`)
        const paragraph = new Y.XmlElement("paragraph")
        const node = new Y.XmlText()
        if (text) node.insert(0, text)
        paragraph.insert(0, [node])
        fragment.insert(0, [paragraph])
        elements.push([elId])
      })
      slidesArray.push([slideId])
    }
  })
}
