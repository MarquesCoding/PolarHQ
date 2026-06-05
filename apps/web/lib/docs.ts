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
  downloadUrl: string
}

/** Whether a Drive node is an Orbit document. */
export const isDocNode = (node: Pick<DriveNode, "mimeType">): boolean =>
  node.mimeType === DOC_MIME

export const fetchDocs = (): Promise<DocMeta[]> =>
  apiFetch<{ documents: DocMeta[] }>("/api/v1/docs/documents").then((r) => r.documents)

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
