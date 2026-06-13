import { apiFetch } from "@polarhq/sdk/apiClient"
import type { DriveNode } from "./drive"
import { decryptName, decryptSharedName } from "./e2e"
import { sdkConfig } from "@polarhq/sdk/config"

/** Mimes that mark a Drive node as an Vault collaborative document (body = Yjs snapshot). */
export const DOC_MIME = "application/vnd.vault.doc"
export const SHEET_MIME = "application/vnd.vault.sheet"
export const BOARD_MIME = "application/vnd.vault.board"

export type DocType = "doc" | "sheet" | "board"

/** Map a node mime to its app type (or null if it isn't an Vault document). */
export const docTypeOf = (mime: string | null): DocType | null =>
  mime === DOC_MIME
    ? "doc"
    : mime === SHEET_MIME
      ? "sheet"
      : mime === BOARD_MIME
        ? "board"
        : null

/** List/home route for each document type. */
export const DOC_ROUTES: Record<DocType, string> = {
  doc: "/docs",
  sheet: "/sheets",
  board: "/whiteboards",
}

/** Dedicated fullscreen editor routes (singular), distinct from the list/home routes. */
export const EDITOR_ROUTES: Record<DocType, string> = {
  doc: "/document",
  sheet: "/sheet",
  board: "/whiteboard",
}

/** The fullscreen editor URL for a document. */
export const editorHref = (type: DocType, id: string): string => `${EDITOR_ROUTES[type]}/${id}`

/** Documents open in their own fullscreen editor in a new browser tab. */
export const editorOpensNewTab = (type: DocType): boolean =>
  (["doc", "sheet", "board"] as DocType[]).includes(type)

/** Navigate to a document's editor, opening fullscreen apps in a new tab. */
export const openEditor = (
  type: DocType,
  id: string,
  router: { push: (href: string) => void },
): void => {
  const href = editorHref(type, id)
  if (editorOpensNewTab(type)) window.open(href, "_blank", "noopener")
  else router.push(href)
}

export const isSheetNode = (node: Pick<DriveNode, "mimeType">): boolean =>
  node.mimeType === SHEET_MIME

export interface DocMeta {
  id: string
  parentId: string | null
  name: string
  encryptedName?: string | null
  sharedName?: string | null
  mimeType: string | null
  sizeBytes: number | null
  createdAt: string
  updatedAt: string
  /** Whether the requesting user owns this document (vs. it being shared with them). */
  owner: boolean
  downloadUrl: string
}

/**
 * Decrypt a doc's display name: owners decrypt via the account metadata key; collaborators
 * (who don't hold it) decrypt the content-key-wrapped `sharedName`.
 */
const decryptDocName = async (doc: DocMeta): Promise<DocMeta> => {
  const name = doc.owner
    ? decryptName(doc.encryptedName)
    : await decryptSharedName(doc.id, doc.sharedName)
  return name ? { ...doc, name } : doc
}

export interface DocListing {
  documents: DocMeta[]
  shared: DocMeta[]
}

export type DocRole = "editor" | "viewer"

export interface DocCollaborator {
  userId: string
  name: string
  email: string
  role: DocRole
}

/** Whether a Drive node is an Vault document. */
export const isDocNode = (node: Pick<DriveNode, "mimeType">): boolean =>
  node.mimeType === DOC_MIME

export const fetchDocs = async (type: DocType = "doc"): Promise<DocListing> => {
  const listing = await apiFetch<DocListing>(`/api/v1/docs/documents?type=${type}`)
  return {
    documents: await Promise.all(listing.documents.map(decryptDocName)),
    shared: await Promise.all(listing.shared.map(decryptDocName)),
  }
}

export const fetchDocCollaborators = (id: string): Promise<DocCollaborator[]> =>
  apiFetch<{ collaborators: DocCollaborator[] }>(
    `/api/v1/docs/documents/${id}/collaborators`,
  ).then((r) => r.collaborators)

export const addDocCollaborator = (
  id: string,
  email: string,
  role: DocRole,
): Promise<DocCollaborator> =>
  apiFetch<{ collaborator: DocCollaborator }>(`/api/v1/docs/documents/${id}/collaborators`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  }).then((r) => r.collaborator)

export const removeDocCollaborator = (id: string, userId: string): Promise<{ ok: true }> =>
  apiFetch(`/api/v1/docs/documents/${id}/collaborators/${userId}`, { method: "DELETE" })

export const fetchDoc = (id: string): Promise<DocMeta> =>
  apiFetch<{ document: DocMeta }>(`/api/v1/docs/documents/${id}`).then((r) => decryptDocName(r.document))

export const createDoc = (
  parentId?: string | null,
  title?: string,
  type: DocType = "doc",
): Promise<DocMeta> =>
  apiFetch<{ document: DocMeta }>("/api/v1/docs/documents", {
    method: "POST",
    body: JSON.stringify({ parentId: parentId ?? null, title, type }),
  }).then((r) => r.document)

/** Fetch a document's raw content bytes (a Yjs snapshot). */
export const fetchDocContent = async (id: string): Promise<ArrayBuffer> => {
  const response = await fetch(`${sdkConfig().apiUrl}/api/v1/docs/documents/${id}/content`, {
    credentials: "include",
  })
  if (!response.ok) throw new Error(`Could not load document (${response.status})`)
  return response.arrayBuffer()
}

/** Persist a document's content (a Yjs snapshot) by overwriting the Drive file body. */
export const saveDocContent = async (id: string, bytes: Uint8Array): Promise<void> => {
  const response = await fetch(`${sdkConfig().apiUrl}/api/v1/docs/documents/${id}/content`, {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/octet-stream" },
    body: bytes as BodyInit,
  })
  if (!response.ok) throw new Error(`Could not save document (${response.status})`)
}
