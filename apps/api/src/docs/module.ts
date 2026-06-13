import { type PermissionDef, registerPermissions } from "@polarhq/auth"

export const DOCS_APP_ID = "docs"

export const DOCS_PERMISSIONS: PermissionDef[] = [
  { key: "docs.document.read", description: "View documents", resource: "document", action: "read" },
  { key: "docs.document.create", description: "Create documents", resource: "document", action: "create" },
  { key: "docs.document.update", description: "Edit documents", resource: "document", action: "update" },
  { key: "docs.document.delete", description: "Delete documents", resource: "document", action: "delete" },
  { key: "docs.document.share", description: "Share documents", resource: "document", action: "share" },
]

/** Register the Docs module's permissions (documents live in Drive, so storage limits are shared). */
export const registerDocsModule = (): void => {
  registerPermissions(DOCS_PERMISSIONS)
}
