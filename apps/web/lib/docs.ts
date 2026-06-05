import { apiFetch } from "@lib/apiClient"
import type { DriveNode } from "@lib/drive"
import { API_URL } from "@lib/env"

/** Mime that marks a Drive node as an Orbit document (its body is a Yjs snapshot). */
export const DOC_MIME = "application/vnd.orbit.doc"

export interface DocMeta {
  id: string
  parentId: string | null
  name: string
  mimeType: string | null
  sizeBytes: number | null
  createdAt: string
  updatedAt: string
  /** Whether the requesting user owns this document (vs. it being shared with them). */
  owner: boolean
  downloadUrl: string
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

/** Whether a Drive node is an Orbit document. */
export const isDocNode = (node: Pick<DriveNode, "mimeType">): boolean =>
  node.mimeType === DOC_MIME

export const fetchDocs = (): Promise<DocListing> =>
  apiFetch<DocListing>("/api/v1/docs/documents")

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
  apiFetch<{ document: DocMeta }>(`/api/v1/docs/documents/${id}`).then((r) => r.document)

export const createDoc = (
  parentId?: string | null,
  title?: string,
): Promise<DocMeta> =>
  apiFetch<{ document: DocMeta }>("/api/v1/docs/documents", {
    method: "POST",
    body: JSON.stringify({ parentId: parentId ?? null, title }),
  }).then((r) => r.document)

/** Fetch a document's raw content bytes (a Yjs snapshot). */
export const fetchDocContent = async (id: string): Promise<ArrayBuffer> => {
  const response = await fetch(`${API_URL}/api/v1/docs/documents/${id}/content`, {
    credentials: "include",
  })
  if (!response.ok) throw new Error(`Could not load document (${response.status})`)
  return response.arrayBuffer()
}

/** Persist a document's content (a Yjs snapshot) by overwriting the Drive file body. */
export const saveDocContent = async (id: string, bytes: Uint8Array): Promise<void> => {
  const response = await fetch(`${API_URL}/api/v1/docs/documents/${id}/content`, {
    method: "PUT",
    credentials: "include",
    headers: { "content-type": "application/octet-stream" },
    body: bytes as BodyInit,
  })
  if (!response.ok) throw new Error(`Could not save document (${response.status})`)
}
